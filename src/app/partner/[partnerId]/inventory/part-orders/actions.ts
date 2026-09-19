"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getPartOrderFormFields } from "@/lib/sample-data/warehouse";
import { adjustStockQty, getQtyOnHand } from "@/lib/inventoryStock";

/**
 * Creates a Part Order AND deducts it from the source warehouse's real
 * Stock, since a Part Order is material actually leaving that warehouse —
 * but only once it's marked Dispatched or Delivered; a Pending order
 * hasn't left the shelf yet, so it doesn't touch stock until its status
 * says otherwise. Fail-closed: dispatching more than what's on hand is
 * rejected.
 */
export async function createPartOrderAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const materialId = String(values["materialId"] ?? "").trim();
  const sourceWarehouseName = String(values["sourceWarehouseName"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);
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

  await createBusinessRecord(partnerId, "inventory-part-orders", values);
  if (leavesWarehouse) {
    await adjustStockQty(partnerId, materialId, materialId, sourceWarehouseName, -quantity);
  }

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

export async function bulkImportPartOrdersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getPartOrderFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-part-orders", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const sourceWarehouseName = String(values["sourceWarehouseName"] ?? "").trim();
    const quantity = Number(values["quantity"] ?? 0);
    const status = String(values["status"] ?? "Pending");
    if (materialId && sourceWarehouseName && Number.isFinite(quantity) && quantity > 0 && (status === "Dispatched" || status === "Delivered")) {
      await adjustStockQty(partnerId, materialId, materialId, sourceWarehouseName, -quantity);
    }
    return values;
  });
  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
