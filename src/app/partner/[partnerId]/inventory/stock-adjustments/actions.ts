"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { stockAdjustmentFormFields } from "@/lib/sample-data/warehouse";

export async function bulkImportStockAdjustmentsAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const result = await runBulkImport(partnerId, "inventory-stock-adjustments", file, stockAdjustmentFormFields);
  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  return result;
}
