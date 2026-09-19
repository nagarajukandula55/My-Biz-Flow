"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";
import { getPartner } from "@/lib/partnerData";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockTransferFormFields } from "@/lib/sample-data/warehouse";

/**
 * Creates a stock transfer — same generic create for an intra-partner
 * (own warehouse-to-warehouse) transfer, but gates a partner-to-partner
 * one behind Super Admin approval: whatever status the form submitted is
 * ignored and overridden to "Pending Super Admin Approval" whenever
 * toPartnerId names a different, real, onboarded partner. Nothing here
 * auto-applies to either partner's actual Inventory stock quantities —
 * same as every other stock-transfers record today (see the module's own
 * "not tied to live Stock deduction" note) — this only gates the RECORD's
 * status; Super Admin approving it (see /admin/stock-transfers in
 * My-Biz-Flow-Admin) is what marks it Completed and creates the mirrored
 * inbound record on the destination partner's own list.
 */
export async function createStockTransferAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const toPartnerId = String(values["toPartnerId"] ?? "").trim();
  const toWarehouseName = String(values["toWarehouseName"] ?? "").trim();

  if (!toPartnerId && !toWarehouseName) {
    return { error: "Choose a destination warehouse OR a destination Partner ID." };
  }
  if (toPartnerId && toWarehouseName) {
    return { error: "Choose only one: a destination warehouse (own transfer) or a destination Partner ID (partner-to-partner transfer), not both." };
  }

  let record: Row;
  if (toPartnerId && toPartnerId !== partnerId) {
    const destination = await getPartner(toPartnerId);
    if (!destination) return { error: `Partner ID "${toPartnerId}" was not found.` };

    record = await createBusinessRecord(partnerId, "inventory-stock-transfers", {
      ...values,
      toWarehouseName: "",
      toPartnerId,
      status: "Pending Super Admin Approval",
    });
  } else {
    record = await createBusinessRecord(partnerId, "inventory-stock-transfers", {
      ...values,
      toPartnerId: "",
    });
  }

  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  redirect(`/partner/${partnerId}/inventory/stock-transfers/${record["id"]}?created=1`);
}

export async function bulkImportStockTransfersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getStockTransferFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-stock-transfers", file, fields);
  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  return result;
}
