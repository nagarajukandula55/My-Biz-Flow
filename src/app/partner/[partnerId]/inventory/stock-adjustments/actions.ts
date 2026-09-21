"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockAdjustmentFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { adjustStockQty, getQtyOnHand, parseSerialNumbers, validateSerialNumbers, type StockCondition } from "@/lib/inventoryStock";

function stockCondition(condition: unknown): StockCondition {
  return condition === "Defective" ? "Defective" : "Good";
}

/**
 * Creates a Stock Adjustment record AND actually applies it to the real
 * Stock quantity — an Increase adds, a Decrease subtracts (fail-closed: a
 * Decrease larger than what's on hand is rejected rather than going
 * negative). This is the one place a Stock quantity should change by
 * manual entry — Stock's own edit page no longer exposes Qty on Hand as
 * an editable field, precisely so every quantity change has a reason and
 * a paper trail here (or via Part Orders / Stock Take) instead of a bare
 * number overwrite with no record of why.
 */
export async function createStockAdjustmentAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const materialId = String(values["materialId"] ?? "").trim();
  const warehouseName = String(values["warehouseName"] ?? "").trim();
  const adjustmentType = String(values["adjustmentType"] ?? "");
  const quantity = Number(values["quantity"] ?? 0);

  if (!materialId || !warehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, Warehouse and a positive Quantity are required." };
  }

  const condition = stockCondition(values["condition"]);
  const delta = adjustmentType === "Decrease" ? -quantity : quantity;
  if (delta < 0) {
    const available = await getQtyOnHand(partnerId, materialId, warehouseName, condition);
    if (available < quantity) {
      return { error: `Cannot decrease by ${quantity} — only ${available} ${condition} on hand for this material at this warehouse.` };
    }
  }

  // A serialized material (BOM's own "Serialized" flag) needs one barcode/
  // serial collected per unit, not just a bare quantity — a non-serialized
  // material goes through on quantity alone, nothing else asked.
  const bomOptions = await getBomOptionsForPartner(partnerId);
  const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
  const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
  if (isSerialized) {
    const error = validateSerialNumbers(serialNumbers, quantity, materialId);
    if (error) return { error };
  }

  await createBusinessRecord(partnerId, "inventory-stock-adjustments", {
    ...values,
    serialNumbers: isSerialized ? serialNumbers : [],
  });
  await adjustStockQty(partnerId, materialId, materialId, warehouseName, delta, condition);

  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

export async function bulkImportStockAdjustmentsAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const fields = await getStockAdjustmentFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-stock-adjustments", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const warehouseName = String(values["warehouseName"] ?? "").trim();
    const quantity = Number(values["quantity"] ?? 0);
    if (!materialId || !warehouseName || !Number.isFinite(quantity) || quantity <= 0) return values;

    const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
    const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (isSerialized) {
      const error = validateSerialNumbers(serialNumbers, quantity, materialId);
      if (error) throw new Error(`Row for "${materialId}": ${error}`);
    }

    const delta = values["adjustmentType"] === "Decrease" ? -quantity : quantity;
    await adjustStockQty(partnerId, materialId, materialId, warehouseName, delta, stockCondition(values["condition"]));
    return { ...values, serialNumbers: isSerialized ? serialNumbers : [] };
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
