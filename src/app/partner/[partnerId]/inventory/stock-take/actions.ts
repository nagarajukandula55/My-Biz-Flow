"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { stockTakeFormFields } from "@/lib/sample-data/warehouse";
import { setStockQty } from "@/lib/inventoryStock";

/**
 * Same shape as createBusinessRecordAction (bind with .bind(null, partnerId)
 * before passing as a RecordForm `action` prop), but stores the computed
 * variance (countedQty - expectedQty) alongside the entered values —
 * variance is read-only/derived, never typed by the counter. When the
 * count is entered as already Reconciled, this also sets the real Stock
 * quantity to the counted figure (a physical count corrects the system's
 * number, not the other way round) — a Pending stock take doesn't touch
 * live stock until it's reconciled.
 */
export async function createStockTakeAction(
  partnerId: string,
  values: Record<string, unknown>
) {
  await requireSessionPartnerId(partnerId);
  const expectedQty = Number(values["expectedQty"] ?? 0);
  const countedQty = Number(values["countedQty"] ?? 0);
  const materialId = String(values["materialId"] ?? "").trim();
  const warehouseName = String(values["warehouseName"] ?? "").trim();
  const record = await createBusinessRecord(partnerId, "inventory-stock-take", {
    ...values,
    variance: countedQty - expectedQty,
  });
  if (values["status"] === "Reconciled" && materialId && warehouseName) {
    await setStockQty(partnerId, materialId, materialId, warehouseName, countedQty);
  }
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/stock-take?created=1#${record.id}`);
}

export async function bulkImportStockTakeAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const result = await runBulkImport(partnerId, "inventory-stock-take", file, stockTakeFormFields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const warehouseName = String(values["warehouseName"] ?? "").trim();
    const countedQty = Number(values["countedQty"] ?? 0);
    if (values["status"] === "Reconciled" && materialId && warehouseName) {
      await setStockQty(partnerId, materialId, materialId, warehouseName, countedQty);
    }
    return {
      ...values,
      variance: countedQty - Number(values["expectedQty"] ?? 0),
    };
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
