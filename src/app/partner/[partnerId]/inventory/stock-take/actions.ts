"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockTakeCsvFields, getWarehouseOptionsForPartner, type StockTakeLineItem } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { setStockQty, getQtyOnHand, adjustReservedQty, parseSerialNumbers, validateSerialNumbers, type StockCondition } from "@/lib/inventoryStock";
import { createStockLots, consumeFifo } from "@/lib/stockLots";
import { recordInventoryTransaction } from "@/lib/inventoryLedger";
import { requestInventoryOtp, verifyInventoryOtp } from "@/lib/inventoryOtp";

function stockCondition(condition: unknown): StockCondition {
  return condition === "Defective" ? "Defective" : "Good";
}

function bareMaterialCode(materialId: string): string {
  return materialId.split(" — ")[0].trim();
}

/**
 * Live "expected qty" lookup for the New Stock Take modal — called from the
 * client (MaterialLineItemsTable, in stockTakeMode) whenever a row's
 * material/warehouse/type is picked or changed, so Expected Qty is
 * pre-filled from the system's current qtyOnHand (not manually typed 0) —
 * matching the modal's own copy ("Expected Qty is the system's current
 * figure"). Deliberately reads qtyOnHand, not availableQty: a physical
 * count's expected figure is the full quantity supposed to be on the shelf,
 * not qty minus whatever's already reserved elsewhere. Still just a
 * pre-fill — the returned value remains an editable input for an auditor to
 * correct.
 */
export async function getExpectedQtyAction(
  partnerId: string,
  materialId: string,
  warehouseName: string,
  condition?: string
): Promise<number> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!materialId.trim() || !warehouseName.trim()) return 0;
  return getQtyOnHand(partnerId, materialId, warehouseName, stockCondition(condition));
}

type RawLine = {
  materialId: string;
  expectedQty: number;
  countedQty: number;
  condition?: string;
  unitPrice?: number;
  serialNumbers?: string;
};

/**
 * Creates a whole Stock Take document — a shared header (Warehouse, Counted
 * Date, Counted By, Note) plus one line per counted material (Material,
 * Expected Qty, Counted Qty, Material Type, Unit Price, Serial/Barcode
 * Numbers where the material is Serialized in BOM), same "add row" pattern
 * MaterialLineItemsTable already gives Stock Adjustments/Return Orders.
 *
 * `status` is NEVER accepted from the caller/form — every Stock Take always
 * starts "Pending" here, server-side, regardless of whatever a crafted
 * request might try to submit. Nothing in this function ever calls
 * setStockQty/createStockLots/consumeFifo — a Pending Stock Take has zero
 * effect on real Stock; only reconcileStockTakeAction (below), gated behind
 * a verified Telegram OTP, is allowed to apply it.
 */
export async function createStockTakeMultiAction(
  partnerId: string,
  common: Record<string, unknown>,
  lines: RawLine[]
): Promise<void | { error?: string; createdId?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one line item." };
  }

  const warehouseName = String(common["warehouseName"] ?? "").trim();
  if (!warehouseName) return { error: "Warehouse is required." };

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const lineItems: StockTakeLineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const materialId = String(line.materialId ?? "").trim();
    const expectedQty = Number(line.expectedQty ?? 0);
    const countedQty = Number(line.countedQty ?? 0);
    if (!materialId) return { error: `Line ${i + 1}: Material is required.` };
    if (!Number.isFinite(expectedQty) || expectedQty < 0 || !Number.isFinite(countedQty) || countedQty < 0) {
      return { error: `Line ${i + 1} (${materialId}): Expected Qty and Counted Qty must be valid, non-negative numbers.` };
    }

    const meta = bomOptions.find((o) => o.label === materialId);
    const serialNumbers = parseSerialNumbers(line.serialNumbers);
    if (meta?.serialized) {
      const error = validateSerialNumbers(serialNumbers, countedQty, materialId);
      if (error) return { error: `Line ${i + 1}: ${error}` };
    }

    lineItems.push({
      materialId,
      condition: stockCondition(line.condition),
      expectedQty,
      countedQty,
      variance: countedQty - expectedQty,
      unitPrice: Number(line.unitPrice ?? 0),
      serialNumbers: meta?.serialized ? serialNumbers : [],
    });
  }

  const netVariance = lineItems.reduce((sum, l) => sum + l.variance, 0);
  const record = await createBusinessRecord(partnerId, "inventory-stock-take", {
    warehouseName,
    countedDate: common["countedDate"],
    countedBy: common["countedBy"] ?? "",
    note: common["note"] ?? "",
    lineItems,
    lineCount: lineItems.length,
    netVariance,
    status: "Pending",
  });

  // Protect the affected quantity from being sold/consumed elsewhere while
  // this count sits Pending, awaiting its OTP-gated reconcile: reserve
  // abs(variance) per line (a zero variance has nothing to protect — the
  // physical count already matches the live figure). Released either by
  // verifyAndReconcileStockTakeAction (applying the real adjustment) or by
  // a future cancel/discard path — see that function's own comment.
  for (const line of lineItems) {
    if (line.variance !== 0) {
      await adjustReservedQty(partnerId, line.materialId, line.materialId, warehouseName, Math.abs(line.variance), line.condition);
    }
  }

  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  redirect(`/partner/${partnerId}/inventory/stock-take/${record.id}?created=1`);
}

/** Sends a fresh Telegram OTP for reconciling this Stock Take — purpose "stock-take-close" (src/lib/inventoryOtp.ts). */
export async function requestStockTakeReconcileOtpAction(partnerId: string, recordId: string, label: string) {
  partnerId = await requireSessionPartnerId(partnerId);
  return requestInventoryOtp(partnerId, "stock-take-close", recordId, label);
}

/**
 * Verifies the OTP and, only on success, actually applies the Stock Take:
 * for each line, setStockQty corrects the system's on-hand number to the
 * physical count (unchanged logic from the old single-line flow), then a
 * positive variance (found extra stock) creates new StockLot rows via
 * createStockLots (condition-aware, one row per captured serial for a
 * serialized line) and a negative variance (shrinkage) draws down existing
 * lots FIFO via consumeFifo. Finally records ONE InventoryTransaction for
 * the whole document: net = Σ(variance × unitPrice) across every line —
 * net ≥ 0 (found more value than expected) posts as "debit"; net < 0
 * (missing value) posts as "credit". This mirrors getInventoryStatement's
 * own sign convention (credit increases the ledger balance / debit
 * decreases it) applied to a physical count's own dollar impact, not a
 * cash movement.
 */
export async function verifyAndReconcileStockTakeAction(
  partnerId: string,
  recordId: string,
  code: string
): Promise<{ verified: boolean; reason?: string; error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const result = await verifyInventoryOtp(partnerId, "stock-take-close", recordId, code);
  if (!result.verified) return { verified: false, reason: result.reason };

  const record = await getBusinessRecord(partnerId, "inventory-stock-take", recordId);
  if (!record) return { verified: true, error: "Stock Take not found." };
  if (record["status"] === "Reconciled") return { verified: true, error: "This Stock Take was already reconciled." };

  const warehouseName = String(record["warehouseName"] ?? "").trim();
  const warehouseOptions = await getWarehouseOptionsForPartner(partnerId);
  const warehouse = warehouseOptions.find((w) => w.label === warehouseName);
  const bomOptions = await getBomOptionsForPartner(partnerId);
  const lineItems = (record["lineItems"] as StockTakeLineItem[] | undefined) ?? [];

  let netValuePaise = 0;
  for (const line of lineItems) {
    const meta = bomOptions.find((o) => o.label === line.materialId);
    const bareCode = bareMaterialCode(line.materialId);
    const unitPricePaise = Math.round((line.unitPrice ?? 0) * 100);

    await setStockQty(partnerId, line.materialId, line.materialId, warehouseName, line.countedQty, line.condition);

    // Release the reservation createStockTakeMultiAction placed on this
    // line's variance now that the real adjustment (setStockQty above, plus
    // the lot creation/consumption below) has actually been applied.
    if (line.variance !== 0) {
      await adjustReservedQty(partnerId, line.materialId, line.materialId, warehouseName, -Math.abs(line.variance), line.condition);
    }

    if (warehouse) {
      if (line.variance > 0) {
        await createStockLots({
          partnerId,
          warehouseId: warehouse.value,
          warehouseName,
          materialId: bareCode,
          materialLabel: line.materialId,
          condition: line.condition,
          serialized: Boolean(meta?.serialized),
          serialNumbers: meta?.serialized ? line.serialNumbers.slice(-line.variance) : undefined,
          quantity: meta?.serialized ? undefined : line.variance,
          unitCost: unitPricePaise,
          sourceType: "stock-take",
          sourceRecordId: recordId,
        });
      } else if (line.variance < 0) {
        await consumeFifo(partnerId, bareCode, warehouse.value, line.condition, -line.variance);
      }
    }

    netValuePaise += line.variance * unitPricePaise;
  }

  await recordInventoryTransaction({
    partnerId,
    sourceType: "stock-take",
    sourceRecordId: recordId,
    direction: netValuePaise >= 0 ? "debit" : "credit",
    amount: Math.abs(netValuePaise),
    description: `Stock Take ${recordId} reconciled at ${warehouseName} — net variance value ${(netValuePaise / 100).toFixed(2)}`,
  });

  await updateBusinessRecord(partnerId, "inventory-stock-take", recordId, {
    ...record,
    status: "Reconciled",
  });

  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  revalidatePath(`/partner/${partnerId}/inventory/stock-take/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return { verified: true };
}

/**
 * Cancels a still-Pending Stock Take without applying it, releasing every
 * reservation createStockTakeMultiAction/bulkImportStockTakeAction placed on
 * its lines — otherwise an abandoned count with a nonzero variance would
 * hold that stock reserved (unavailable to sell/consume) forever, since only
 * verifyAndReconcileStockTakeAction (above) previously released it.
 */
export async function cancelStockTakeAction(
  partnerId: string,
  recordId: string
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const record = await getBusinessRecord(partnerId, "inventory-stock-take", recordId);
  if (!record) return { error: "Stock Take not found." };
  if (record["status"] !== "Pending") return { error: "Only a Pending Stock Take can be cancelled." };

  const warehouseName = String(record["warehouseName"] ?? "").trim();
  const lineItems = (record["lineItems"] as StockTakeLineItem[] | undefined) ?? [];

  for (const line of lineItems) {
    if (line.variance !== 0) {
      await adjustReservedQty(partnerId, line.materialId, line.materialId, warehouseName, -Math.abs(line.variance), line.condition);
    }
  }

  await updateBusinessRecord(partnerId, "inventory-stock-take", recordId, {
    ...record,
    status: "Cancelled",
  });

  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  revalidatePath(`/partner/${partnerId}/inventory/stock-take/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return {};
}

/**
 * CSV bulk import — kept single-line-per-row for simplicity (same scope
 * decision the original file made). Every imported row becomes its own
 * one-line Stock Take document, always starting "Pending" — it no longer
 * calls setStockQty directly (that bypassed the OTP gate entirely); a
 * bulk-imported count must be opened and reconciled through the OTP flow
 * exactly like one entered by hand.
 */
export async function bulkImportStockTakeAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const fields = await getStockTakeCsvFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-stock-take", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const expectedQty = Number(values["expectedQty"] ?? 0);
    const countedQty = Number(values["countedQty"] ?? 0);
    const condition = stockCondition(values["condition"]);
    const meta = bomOptions.find((o) => o.label === materialId);
    const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (meta?.serialized) {
      const error = validateSerialNumbers(serialNumbers, countedQty, materialId);
      if (error) throw new Error(`Row for "${materialId}": ${error}`);
    }

    const lineItems: StockTakeLineItem[] = materialId
      ? [
          {
            materialId,
            condition,
            expectedQty,
            countedQty,
            variance: countedQty - expectedQty,
            unitPrice: Number(values["unitPrice"] ?? 0),
            serialNumbers: meta?.serialized ? serialNumbers : [],
          },
        ]
      : [];

    // Same reservation createStockTakeMultiAction places on a manually
    // entered count — a bulk-imported row starts Pending too and must not
    // leave its variance unprotected until reconciled.
    const bulkWarehouseName = String(values["warehouseName"] ?? "").trim();
    if (materialId && bulkWarehouseName && countedQty - expectedQty !== 0) {
      await adjustReservedQty(partnerId, materialId, materialId, bulkWarehouseName, Math.abs(countedQty - expectedQty), condition);
    }

    return {
      warehouseName: values["warehouseName"],
      countedDate: values["countedDate"],
      countedBy: values["countedBy"] ?? "",
      note: values["note"] ?? "",
      lineItems,
      lineCount: lineItems.length,
      netVariance: countedQty - expectedQty,
      status: "Pending",
    };
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  return result;
}
