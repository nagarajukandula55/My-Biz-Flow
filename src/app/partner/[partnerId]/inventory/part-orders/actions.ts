"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getPartOrderFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { adjustStockQty, getQtyOnHand, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";

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

  await createBusinessRecord(partnerId, "inventory-part-orders", {
    ...values,
    serialNumbers: isSerialized ? serialNumbers : [],
  });
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
    return { ...values, serialNumbers: isSerialized ? serialNumbers : [] };
  });
  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
