"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { stockAdjustmentFormFields } from "@/lib/sample-data/warehouse";
import { adjustStockQty, getQtyOnHand } from "@/lib/inventoryStock";

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

  const delta = adjustmentType === "Decrease" ? -quantity : quantity;
  if (delta < 0) {
    const available = await getQtyOnHand(partnerId, materialId, warehouseName);
    if (available < quantity) {
      return { error: `Cannot decrease by ${quantity} — only ${available} on hand for this material at this warehouse.` };
    }
  }

  await createBusinessRecord(partnerId, "inventory-stock-adjustments", values);
  await adjustStockQty(partnerId, materialId, materialId, warehouseName, delta);

  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

export async function bulkImportStockAdjustmentsAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const result = await runBulkImport(partnerId, "inventory-stock-adjustments", file, stockAdjustmentFormFields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const warehouseName = String(values["warehouseName"] ?? "").trim();
    const quantity = Number(values["quantity"] ?? 0);
    if (materialId && warehouseName && Number.isFinite(quantity) && quantity > 0) {
      const delta = values["adjustmentType"] === "Decrease" ? -quantity : quantity;
      await adjustStockQty(partnerId, materialId, materialId, warehouseName, delta);
    }
    return values;
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
