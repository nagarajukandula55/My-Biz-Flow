"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";
import { getPartner } from "@/lib/partnerData";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockTransferFormFields, getWarehouseOptionsForPartner, type StockTransferLineItem } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { getQtyOnHand, adjustStockQty, parseSerialNumbers, validateSerialNumbers, type StockCondition } from "@/lib/inventoryStock";
import { createStockLots, consumeFifo } from "@/lib/stockLots";
import { recordInventoryTransaction } from "@/lib/inventoryLedger";
import { requestInventoryOtp, verifyInventoryOtp } from "@/lib/inventoryOtp";

function stockCondition(condition: unknown): StockCondition {
  return condition === "Defective" ? "Defective" : "Good";
}

function bareMaterialCode(materialId: string): string {
  return materialId.split(" — ")[0].trim();
}

type RawLine = {
  materialId: string;
  quantity: number;
  condition?: string;
  unitPrice?: number;
  serialNumbers?: string;
};

/**
 * Core "create one own-warehouse transfer document" logic — a shared header
 * (From Warehouse, To Warehouse, Transfer Date, Reason) plus one or more
 * material lines (Material, Quantity, Material Type, Unit Price, Serial
 * Numbers where Serialized). Always creates the record as "Pending" and
 * NEVER moves real Stock here — an own-warehouse transfer used to apply
 * immediately at creation; it no longer does. The actual stock move only
 * happens once verifyAndCloseStockTransferAction confirms a Telegram OTP
 * (see the transfer's detail page's Reconcile/Confirm panel).
 */
async function createOwnWarehouseTransferCore(
  partnerId: string,
  common: Record<string, unknown>,
  lines: RawLine[]
): Promise<{ error?: string; record?: Row }> {
  const fromWarehouseName = String(common["fromWarehouseName"] ?? "").trim();
  const toWarehouseName = String(common["toWarehouseName"] ?? "").trim();
  if (!fromWarehouseName || !toWarehouseName) {
    return { error: "Both From Warehouse and To Warehouse are required for an own-warehouse transfer." };
  }
  if (fromWarehouseName === toWarehouseName) {
    return { error: "From Warehouse and To Warehouse can't be the same." };
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one line item." };
  }

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const lineItems: StockTransferLineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const materialId = String(line.materialId ?? "").trim();
    const quantity = Number(line.quantity ?? 0);
    if (!materialId || !Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Line ${i + 1}: Material and a positive Quantity are required.` };
    }
    const meta = bomOptions.find((o) => o.label === materialId);
    const serialNumbers = parseSerialNumbers(line.serialNumbers);
    if (meta?.serialized) {
      const error = validateSerialNumbers(serialNumbers, quantity, materialId);
      if (error) return { error: `Line ${i + 1}: ${error}` };
    }
    lineItems.push({
      materialId,
      quantity,
      condition: stockCondition(line.condition),
      unitPrice: Number(line.unitPrice ?? 0),
      serialNumbers: meta?.serialized ? serialNumbers : [],
    });
  }

  const record = await createBusinessRecord(partnerId, "inventory-stock-transfers", {
    fromWarehouseName,
    toWarehouseName,
    toPartnerId: "",
    transferDate: common["transferDate"],
    reason: common["reason"] ?? "",
    lineItems,
    lineCount: lineItems.length,
    status: "Pending",
  });
  return { record };
}

/** Multi-line create for the own-warehouse (intra-partner) path — see StockTransfersNewButton.tsx. */
export async function createStockTransferMultiAction(
  partnerId: string,
  common: Record<string, unknown>,
  lines: RawLine[]
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const { error, record } = await createOwnWarehouseTransferCore(partnerId, common, lines);
  if (error) return { error };

  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  redirect(`/partner/${partnerId}/inventory/stock-transfers/${record!["id"]}?created=1`);
}

/**
 * Creates a stock transfer. Partner-to-partner (toPartnerId names a
 * different, real, onboarded partner) is UNCHANGED — whatever status the
 * form submitted is ignored and overridden to "Pending Super Admin
 * Approval"; nothing here touches either partner's real Stock, same as
 * before (Super Admin approving it is what completes it — see
 * /admin/stock-transfers in My-Biz-Flow-Admin).
 *
 * Own-warehouse (toWarehouseName set, same partner): this branch USED TO
 * apply the stock move immediately as "Completed". It no longer does — it
 * now delegates to createOwnWarehouseTransferCore, which always creates a
 * single-line-item "Pending" document; the real move only happens once the
 * transfer's own detail page verifies a Reconcile OTP (see
 * verifyAndCloseStockTransferAction). Kept here (not just in the new
 * createStockTransferMultiAction) for any remaining single-line caller
 * (e.g. stock-transfers/new/page.tsx's plain RecordForm).
 */
export async function createStockTransferAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const toPartnerId = String(values["toPartnerId"] ?? "").trim();
  const toWarehouseName = String(values["toWarehouseName"] ?? "").trim();
  const materialId = String(values["materialId"] ?? "").trim();
  const fromWarehouseName = String(values["fromWarehouseName"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);

  if (!toPartnerId && !toWarehouseName) {
    return { error: "Choose a destination warehouse OR a destination Partner ID." };
  }
  if (toPartnerId && toWarehouseName) {
    return { error: "Choose only one: a destination warehouse (own transfer) or a destination Partner ID (partner-to-partner transfer), not both." };
  }
  if (!materialId || !fromWarehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, From Warehouse and a positive Quantity are required." };
  }
  if (toWarehouseName && toWarehouseName === fromWarehouseName) {
    return { error: "From Warehouse and To Warehouse can't be the same." };
  }

  let record: Row;
  if (toPartnerId && toPartnerId !== partnerId) {
    const destination = await getPartner(toPartnerId);
    if (!destination) return { error: `Partner ID "${toPartnerId}" was not found.` };

    record = await createBusinessRecord(partnerId, "inventory-stock-transfers", {
      ...values,
      toWarehouseName: "",
      toPartnerId,
      status: "Pending Super Admin Approval",
      // Serials aren't captured yet — stock (and any serialized units)
      // only actually moves once Super Admin approves this transfer, so
      // there's nothing real to validate against at this point.
      serialNumbers: [],
    });
    // Partner-to-partner: this side's own stock isn't touched until Super
    // Admin approves the transfer (see /admin/stock-transfers in
    // My-Biz-Flow-Admin), which is what actually moves stock on both sides.
  } else {
    // Own-warehouse: delegate to the shared Pending-only core (see its doc
    // comment) — no immediate stock effect any more.
    const { error, record: created } = await createOwnWarehouseTransferCore(partnerId, values, [
      {
        materialId,
        quantity,
        condition: String(values["condition"] ?? "Good"),
        unitPrice: Number(values["unitPrice"] ?? 0),
        serialNumbers: String(values["serialNumbers"] ?? ""),
      },
    ]);
    if (error) return { error };
    record = created!;
  }

  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  redirect(`/partner/${partnerId}/inventory/stock-transfers/${record["id"]}?created=1`);
}

/** Sends a fresh Telegram OTP for closing (moving stock for) this own-warehouse transfer — purpose "stock-transfer-close" (src/lib/inventoryOtp.ts). */
export async function requestStockTransferCloseOtpAction(partnerId: string, recordId: string, label: string) {
  partnerId = await requireSessionPartnerId(partnerId);
  return requestInventoryOtp(partnerId, "stock-transfer-close", recordId, label);
}

/**
 * Verifies the OTP and, only on success, actually moves stock: for each
 * line, fail-closed checks source Available Qty (deferred to here, since
 * stock doesn't move at creation time any more — a Pending transfer's
 * source availability can change before it's confirmed), then
 * consumeFifo() draws the source warehouse's tracked lots down FIFO and
 * createStockLots() creates new lots at the destination warehouse with the
 * SAME condition preserved (a transfer never changes Good/Defective
 * bucket). Records ONE lightweight InventoryTransaction: since both
 * warehouses belong to the same partner this is a real logged movement,
 * not a money event — direction is always "debit" and `amount` is 0
 * (no net effect on the partner's own ledger balance), purely so the
 * movement shows up in getInventoryStatement's audit trail.
 */
export async function verifyAndCloseStockTransferAction(
  partnerId: string,
  recordId: string,
  code: string
): Promise<{ verified: boolean; reason?: string; error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const result = await verifyInventoryOtp(partnerId, "stock-transfer-close", recordId, code);
  if (!result.verified) return { verified: false, reason: result.reason };

  const record = await getBusinessRecord(partnerId, "inventory-stock-transfers", recordId);
  if (!record) return { verified: true, error: "Stock Transfer not found." };
  if (record["status"] === "Completed") return { verified: true, error: "This transfer was already completed." };
  if (record["toPartnerId"]) return { verified: true, error: "This is a partner-to-partner transfer — it completes via Super Admin approval, not here." };

  const fromWarehouseName = String(record["fromWarehouseName"] ?? "").trim();
  const toWarehouseName = String(record["toWarehouseName"] ?? "").trim();
  const warehouseOptions = await getWarehouseOptionsForPartner(partnerId);
  const fromWarehouse = warehouseOptions.find((w) => w.label === fromWarehouseName);
  const toWarehouse = warehouseOptions.find((w) => w.label === toWarehouseName);
  const bomOptions = await getBomOptionsForPartner(partnerId);
  const lineItems = (record["lineItems"] as StockTransferLineItem[] | undefined) ?? [];

  for (const line of lineItems) {
    const available = await getQtyOnHand(partnerId, line.materialId, fromWarehouseName, line.condition);
    if (available < line.quantity) {
      return {
        verified: true,
        error: `Cannot transfer ${line.quantity} of ${line.materialId} — only ${available} ${line.condition} available at ${fromWarehouseName}.`,
      };
    }
  }

  for (const line of lineItems) {
    const meta = bomOptions.find((o) => o.label === line.materialId);
    const bareCode = bareMaterialCode(line.materialId);
    const unitPricePaise = Math.round((line.unitPrice ?? 0) * 100);

    await adjustStockQty(partnerId, line.materialId, line.materialId, fromWarehouseName, -line.quantity, line.condition);
    await adjustStockQty(partnerId, line.materialId, line.materialId, toWarehouseName, line.quantity, line.condition);

    if (fromWarehouse) {
      await consumeFifo(partnerId, bareCode, fromWarehouse.value, line.condition, line.quantity);
    }
    if (toWarehouse) {
      await createStockLots({
        partnerId,
        warehouseId: toWarehouse.value,
        warehouseName: toWarehouseName,
        materialId: bareCode,
        materialLabel: line.materialId,
        condition: line.condition,
        serialized: Boolean(meta?.serialized),
        serialNumbers: meta?.serialized ? line.serialNumbers : undefined,
        quantity: meta?.serialized ? undefined : line.quantity,
        unitCost: unitPricePaise,
        sourceType: "stock-transfer",
        sourceRecordId: recordId,
      });
    }
  }

  await recordInventoryTransaction({
    partnerId,
    sourceType: "stock-transfer",
    sourceRecordId: recordId,
    direction: "debit",
    amount: 0,
    description: `Stock Transfer ${recordId}: ${fromWarehouseName} → ${toWarehouseName} (${lineItems.length} line${lineItems.length === 1 ? "" : "s"}) — internal movement, no net ledger effect.`,
  });

  await updateBusinessRecord(partnerId, "inventory-stock-transfers", recordId, {
    ...record,
    status: "Completed",
  });

  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return { verified: true };
}

export async function bulkImportStockTransfersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getStockTransferFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-stock-transfers", file, fields, async (values) => {
    // Same rule as a normal create — a bulk-imported row never gets to pick
    // "Completed" directly any more; it starts Pending like everything
    // else and needs the OTP-gated Reconcile/Confirm step (own-warehouse
    // only — bulk upload doesn't support a partner-to-partner request).
    return { ...values, toPartnerId: "", status: "Pending" };
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  return result;
}
