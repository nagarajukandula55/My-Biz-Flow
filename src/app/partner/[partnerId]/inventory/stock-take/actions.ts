"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { stockTakeFormFields } from "@/lib/sample-data/warehouse";

/** Same shape as createBusinessRecordAction (bind with .bind(null, partnerId) before
 * passing as a RecordForm `action` prop), but stores the computed variance
 * (countedQty - expectedQty) alongside the entered values — variance is
 * read-only/derived, never typed by the counter. */
export async function createStockTakeAction(
  partnerId: string,
  values: Record<string, unknown>
) {
  await requireSessionPartnerId(partnerId);
  const expectedQty = Number(values["expectedQty"] ?? 0);
  const countedQty = Number(values["countedQty"] ?? 0);
  const record = await createBusinessRecord(partnerId, "inventory-stock-take", {
    ...values,
    variance: countedQty - expectedQty,
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  redirect(`/partner/${partnerId}/inventory/stock-take?created=1#${record.id}`);
}

export async function bulkImportStockTakeAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const result = await runBulkImport(partnerId, "inventory-stock-take", file, stockTakeFormFields, (values) => ({
    ...values,
    variance: Number(values["countedQty"] ?? 0) - Number(values["expectedQty"] ?? 0),
  }));
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  return result;
}
