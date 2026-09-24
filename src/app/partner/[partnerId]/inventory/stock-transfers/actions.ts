"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";
import { getPartner } from "@/lib/partnerData";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockTransferFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { adjustStockQty, getQtyOnHand, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";

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
  const materialId = String(values["materialId"] ?? "").trim();
  const fromWarehouseName = String(values["fromWarehouseName"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);

  if (!toPartnerId && !toWarehouseName) {
    return { error: "Choose a destination warehouse OR a destination Partner ID." };
  }
  if (toPartnerId && toWarehouseName) {
    return { error: "Choose only one: a destination warehouse (own transfer) or a destination Partner ID (partner-to-partner transfer), not both." };
  }
  if (!materialId || !fromWarehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, From Warehouse and a positive Quantity are required." };
  }
  if (toWarehouseName && toWarehouseName === fromWarehouseName) {
    return { error: "From Warehouse and To Warehouse can't be the same." };
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
      // Serials aren't captured yet — stock (and any serialized units)
      // only actually moves once Super Admin approves this transfer, so
      // there's nothing real to validate against at this point.
      serialNumbers: [],
    });
    // Partner-to-partner: this side's own stock isn't touched until Super
    // Admin approves the transfer (see /admin/stock-transfers in
    // My-Biz-Flow-Admin), which is what actually moves stock on both sides.
  } else {
    // Same-partner, warehouse-to-warehouse: real stock moves at creation
    // time (there's no separate approval step to gate on here) —
    // fail-closed against the source warehouse's real Available Qty
    // rather than letting a transfer silently go negative.
    const available = await getQtyOnHand(partnerId, materialId, fromWarehouseName);
    if (available < quantity) {
      return { error: `Cannot transfer ${quantity} — only ${available} available at ${fromWarehouseName}.` };
    }

    // Stock moves immediately for an own-warehouse transfer, so a Serialized
    // material needs its per-unit serial/barcode numbers captured right
    // here — same rule Part Orders/Stock Take enforce at the moment stock
    // actually leaves a warehouse (see MaterialLineItemsTable's doc comment
    // for why this can't auto-lookup a material from a scanned serial).
    const bomOptions = await getBomOptionsForPartner(partnerId);
    const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
    const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (isSerialized) {
      const error = validateSerialNumbers(serialNumbers, quantity, materialId);
      if (error) return { error };
    }

    record = await createBusinessRecord(partnerId, "inventory-stock-transfers", {
      ...values,
      toPartnerId: "",
      status: "Completed",
      serialNumbers: isSerialized ? serialNumbers : [],
    });
    await adjustStockQty(partnerId, materialId, materialId, fromWarehouseName, -quantity);
    await adjustStockQty(partnerId, materialId, materialId, toWarehouseName, quantity);
  }

  revalidatePath(`/partner/${partnerId}/inventory/stock-transfers`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
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
