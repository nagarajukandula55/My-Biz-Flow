"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { stockFormFields } from "@/lib/sample-data/warehouse";

export async function bulkImportStockAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const result = await runBulkImport(partnerId, "inventory-stock", file, stockFormFields);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
