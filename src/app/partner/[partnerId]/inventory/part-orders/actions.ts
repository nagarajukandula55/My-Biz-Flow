"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getPartOrderFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { adjustStockQty, getQtyOnHand, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";
import { recordInventoryTransaction } from "@/lib/inventoryLedger";

/**
 * Core "create one Part Order" logic, shared by the single-line action
 * below (createPartOrderAction, kept for any caller still on a plain
 * one-line RecordForm) and createPartOrdersMultiAction (the "add row"
 * multi-line-item create flow — see PartOrdersNewButton.tsx). Deducts real
 * Stock once the order is marked Dispatched/Delivered at creation (a
 * Pending order hasn't left the shelf yet), and — only at Delivered, the
 * terminal state — posts a "debit" InventoryTransaction (money spent on
 * parts received) for unitPrice × quantity. Does NOT redirect — that's the
 * caller's job, once, after every line item in a submission has been
 * created (or the first error stops the loop early).
 */
async function createPartOrderCore(
  partnerId: string,
  values: Record<string, unknown>
): Promise<{ error?: string; record?: Record<string, unknown> }> {
  const materialId = String(values["materialId"] ?? "").trim();
  const sourceWarehouseName = String(values["sourceWarehouseName"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);
  const unitPrice = Number(values["unitPrice"] ?? 0);
  const status = String(values["status"] ?? "Pending");

  if (!materialId || !sourceWarehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, Source Warehouse and a positive Quantity are required." };
  }

  const leavesWarehouse = status === "Dispatched" || status === "Delivered";
  if (leavesWarehouse) {
    const available = await getQtyOnHand(partnerId, materialId, sourceWarehouseName);
    if (available < quantity) {
      return { error: `Cannot dispatch ${quantity} — only ${available} on hand at ${sourceWarehouseName}.` };
    }
  }

  let isSerialized = false;
  let serialNumbers: string[] = [];
  if (leavesWarehouse) {
    const bomOptions = await getBomOptionsForPartner(partnerId);
    isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
    serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (isSerialized) {
      const error = validateSerialNumbers(serialNumbers, quantity, materialId);
      if (error) return { error };
    }
  }

  const record = await createBusinessRecord(partnerId, "inventory-part-orders", {
    ...values,
    unitPrice,
    serialNumbers: isSerialized ? serialNumbers : [],
  });
  if (leavesWarehouse) {
    await adjustStockQty(partnerId, materialId, materialId, sourceWarehouseName, -quantity);
  }

  if (status === "Delivered") {
    await recordInventoryTransaction({
      partnerId,
      sourceType: "part-order",
      sourceRecordId: String(record["id"]),
      direction: "debit",
      amount: Math.round(unitPrice * 100) * quantity,
      description: `Part Order ${record["id"]} Delivered — ${quantity} x ${materialId} from ${sourceWarehouseName}`,
    });
  }

  return { record };
}

/**
 * Creates a Part Order AND deducts it from the source warehouse's real
 * Stock, since a Part Order is material actually leaving that warehouse —
 * but only once it's marked Dispatched or Delivered; a Pending order
 * hasn't left the shelf yet, so it doesn't touch stock until its status
 * says otherwise. Fail-closed: dispatching more than what's on hand is
 * rejected. A serialized material also needs one barcode/serial per unit
 * captured at the same moment it actually leaves the warehouse (Dispatched/
 * Delivered) — a Pending order doesn't ask for serials yet, and a
 * non-serialized material never asks for them at all.
 */
export async function createPartOrderAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const { error } = await createPartOrderCore(partnerId, values);
  if (error) return { error };

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

/**
 * Multi-line-item create — one shared set of header fields (Linked Return
 * Order, Source Warehouse, Destination Location, Status, Dispatched Date)
 * plus a row per material (Material, Quantity, Unit Price, Serial/Barcode
 * Numbers), the same "add row" pattern Return Orders/Stock Adjustments
 * already use (see MaterialLineItemsTable). Each line becomes its own
 * "inventory-part-orders" BusinessRecord and its own real Stock deduction
 * (once Dispatched/Delivered) — no new field names, existing detail/edit
 * pages keep working unmodified. Lines are applied in order; the first
 * line that fails stops the loop (earlier lines already created/applied in
 * this submission stay that way) and the error names which line/material
 * failed.
 */
export async function createPartOrdersMultiAction(
  partnerId: string,
  common: Record<string, unknown>,
  lines: Array<Record<string, unknown>>
): Promise<{ error?: string; createdIds?: string[] }> {
  partnerId = await requireSessionPartnerId(partnerId);

  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one line item." };
  }

  const createdIds: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const values = { ...common, ...lines[i] };
    const { error, record } = await createPartOrderCore(partnerId, values);
    if (error) {
      const label = String(lines[i]["materialId"] ?? `#${i + 1}`);
      return {
        error: `Line ${i + 1} (${label}): ${error}${createdIds.length > 0 ? ` — ${createdIds.length} earlier line(s) were already created and applied.` : ""}`,
        createdIds,
      };
    }
    createdIds.push(String(record!["id"]));
  }

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/part-orders?created=${createdIds.length}`);
}

export async function bulkImportPartOrdersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const fields = await getPartOrderFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-part-orders", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const sourceWarehouseName = String(values["sourceWarehouseName"] ?? "").trim();
    const quantity = Number(values["quantity"] ?? 0);
    const status = String(values["status"] ?? "Pending");
    const leavesWarehouse = status === "Dispatched" || status === "Delivered";
    if (!materialId || !sourceWarehouseName || !Number.isFinite(quantity) || quantity <= 0 || !leavesWarehouse) return values;

    const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
    const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (isSerialized) {
      const error = validateSerialNumbers(serialNumbers, quantity, materialId);
      if (error) throw new Error(`Row for "${materialId}": ${error}`);
    }
    await adjustStockQty(partnerId, materialId, materialId, sourceWarehouseName, -quantity);

    // Deliberately does NOT post a ledger entry here: runBulkImport's
    // per-row callback runs before the BusinessRecord id exists, and
    // recordInventoryTransaction is upserted keyed on that id (see
    // src/lib/inventoryLedger.ts) — a bulk-imported Delivered row's money
    // impact is left for a manual Stock Adjustment/reconciliation instead
    // of risking a ledger row that can never be looked up by its real
    // source record. Same scope decision Stock Adjustments' bulk import
    // already made for the same reason.
    const unitPrice = Number(values["unitPrice"] ?? 0);
    return { ...values, unitPrice, serialNumbers: isSerialized ? serialNumbers : [] };
  });
  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
