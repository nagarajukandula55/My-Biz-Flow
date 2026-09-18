"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { warehouseFormFields } from "@/lib/sample-data/warehouse";

// "id" (Warehouse Code) excluded from the CSV vocabulary — auto-generated
// when left blank, same convention as BOM's bulk import.
const CSV_FIELDS = warehouseFormFields.filter((f) => f.key !== "id");

export async function bulkImportWarehousesAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const result = await runBulkImport(partnerId, "inventory-warehouses", file, CSV_FIELDS);
  revalidatePath(`/partner/${partnerId}/inventory/warehouses`);
  return result;
}
