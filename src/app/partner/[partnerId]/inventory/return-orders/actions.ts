"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getReturnOrderFormFields } from "@/lib/sample-data/warehouse";
import { adjustStockQty } from "@/lib/inventoryStock";

/**
 * Creates a Return Order AND adds it to the destination warehouse's real
 * Stock — but only once it's marked Received; a Pending/In Transit return
 * hasn't physically arrived at the warehouse yet, so it doesn't touch
 * stock until its status says otherwise (same gate PartOrders uses on
 * dispatch, mirrored here on receipt). Previously this module had no
 * dedicated action at all — it ran on the generic createBusinessRecordAction,
 * which only ever wrote the document and never touched the real Stock
 * ledger, so a "Received" return never actually became available stock.
 */
export async function createReturnOrderAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const materialId = String(values["materialId"] ?? "").trim();
  const destinationWarehouseName = String(values["destinationWarehouseName"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);
  const status = String(values["status"] ?? "Pending");

  if (!materialId || !destinationWarehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, Destination Warehouse and a positive Quantity are required." };
  }

  const record = await createBusinessRecord(partnerId, "inventory-return-orders", values);
  if (status === "Received") {
    await adjustStockQty(partnerId, materialId, materialId, destinationWarehouseName, quantity);
  }

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/return-orders/${record["id"]}?created=1`);
}

export async function bulkImportReturnOrdersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getReturnOrderFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-return-orders", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const destinationWarehouseName = String(values["destinationWarehouseName"] ?? "").trim();
    const quantity = Number(values["quantity"] ?? 0);
    if (materialId && destinationWarehouseName && Number.isFinite(quantity) && quantity > 0 && values["status"] === "Received") {
      await adjustStockQty(partnerId, materialId, materialId, destinationWarehouseName, quantity);
    }
    return values;
  });
  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
