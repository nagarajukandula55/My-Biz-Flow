"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getReturnOrderFormFields, getWarehouseOptionsForPartner, RETURN_ORDER_FINAL_STATUSES } from "@/lib/sample-data/warehouse";
import { adjustStockQty, getQtyOnHand, type StockCondition } from "@/lib/inventoryStock";

function isFinalReturnOrderStatus(status: unknown): boolean {
  return (RETURN_ORDER_FINAL_STATUSES as readonly string[]).includes(String(status ?? ""));
}

/** RETURN_TYPES is ["Defective", "Good"] (see warehouse.ts) — both happen to be valid StockCondition values, so the record's own returnType routes straight to the matching stock bucket; anything else (unset/free text) defaults to Good. */
function returnStockCondition(returnType: unknown): StockCondition {
  return returnType === "Defective" ? "Defective" : "Good";
}

/**
 * Validates and applies the real Stock effect for one Return Order, for
 * either direction. Returns an error string, or null on success (including
 * "nothing to apply yet" — e.g. still Pending).
 *
 * This is the ONLY function in the whole app allowed to decrease Defective
 * stock — see the Outbound branch. No Stock Adjustment, Stock Transfer, or
 * Stock edit-page path may touch a Defective bucket (deliberately, by
 * partner policy: a partner must never be able to manually erase/write off
 * Defective stock — only ship it out against a real Challan Number, which
 * this records and requires before the deduction happens).
 */
async function applyReturnOrderStockEffect(
  partnerId: string,
  values: Record<string, unknown>
): Promise<{ error: string | null; normalized: Record<string, unknown> }> {
  const direction = values["direction"] === "Outbound" ? "Outbound" : "Inbound";
  const materialId = String(values["materialId"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);
  const status = String(values["status"] ?? "Pending");

  if (!materialId || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material and a positive Quantity are required.", normalized: values };
  }

  if (direction === "Outbound") {
    const sourceWarehouseName = String(values["sourceLocation"] ?? "").trim();
    const vendorName = String(values["vendorName"] ?? "").trim();
    const challanNumber = String(values["challanNumber"] ?? "").trim();

    const warehouseOptions = await getWarehouseOptionsForPartner(partnerId);
    if (!warehouseOptions.some((w) => w.label === sourceWarehouseName)) {
      return {
        error: `Source Location must exactly match one of your own Warehouse names for an Outbound return — "${sourceWarehouseName}" isn't one.`,
        normalized: values,
      };
    }
    if (!vendorName) return { error: "Vendor / OEM Name is required for an Outbound return.", normalized: values };
    if (!challanNumber) {
      return { error: "Challan / Delivery Note Number is required for an Outbound return — no manual write-off of Defective stock is allowed.", normalized: values };
    }

    // Only Defective stock is ever allowed to leave this way — force it
    // rather than trust whatever Return Type the form happened to submit.
    const normalized = { ...values, returnType: "Defective", destinationWarehouseName: "" };

    if (status === "Dispatched") {
      const available = await getQtyOnHand(partnerId, materialId, sourceWarehouseName, "Defective");
      if (available < quantity) {
        return { error: `Cannot dispatch ${quantity} — only ${available} Defective on hand at ${sourceWarehouseName}.`, normalized };
      }
      await adjustStockQty(partnerId, materialId, materialId, sourceWarehouseName, -quantity, "Defective");
    }
    return { error: null, normalized };
  }

  // Inbound — unchanged from the original behaviour: stock is added to the
  // destination warehouse's Good or Defective bucket (per Return Type)
  // once the return is marked Received.
  const destinationWarehouseName = String(values["destinationWarehouseName"] ?? "").trim();
  if (!destinationWarehouseName) {
    return { error: "Destination Warehouse is required for an Inbound return.", normalized: values };
  }
  const normalized = { ...values, vendorName: "", challanNumber: "" };
  if (status === "Received") {
    await adjustStockQty(partnerId, materialId, materialId, destinationWarehouseName, quantity, returnStockCondition(values["returnType"]));
  }
  return { error: null, normalized };
}

/**
 * Creates a Return Order AND applies its real Stock effect — Inbound adds
 * to the destination warehouse once Received; Outbound (the only path that
 * can reduce Defective stock) deducts from the source warehouse once
 * Dispatched, gated on a Vendor/OEM name and a Challan Number. A
 * Pending/In Transit order hasn't physically moved yet, so it doesn't
 * touch stock until its status says otherwise.
 */
export async function createReturnOrderAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const { error, normalized } = await applyReturnOrderStockEffect(partnerId, values);
  if (error) return { error };

  const record = await createBusinessRecord(partnerId, "inventory-return-orders", normalized);

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/return-orders/${record["id"]}?created=1`);
}

/**
 * Edits a Return Order that hasn't been finalized yet — status still
 * Pending/In Transit, i.e. its real Stock effect (see
 * applyReturnOrderStockEffect) has never been applied. Once a Return Order
 * reaches Received/Dispatched/Rejected/Cancelled it's locked: no edit page
 * is reachable for it (see [recordId]/edit/page.tsx's own guard) and this
 * action refuses too, so a crafted request can't bypass the UI gate and
 * silently re-run/duplicate a stock movement or reopen a closed record.
 * Re-runs the exact same validation + stock-effect sequence createReturnOrderAction
 * does, since the edited values might change direction/quantity/status
 * (e.g. editing a Pending Outbound straight to Dispatched applies the
 * deduction here, exactly as if it had been created that way).
 */
export async function updateReturnOrderAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-return-orders", recordId);
  if (!existing) return { error: "Return Order not found." };
  if (isFinalReturnOrderStatus(existing["status"])) {
    return { error: `This Return Order is already ${existing["status"]} — it can no longer be edited.` };
  }

  const { error, normalized } = await applyReturnOrderStockEffect(partnerId, values);
  if (error) return { error };

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, normalized);

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/return-orders/${recordId}?updated=1`);
}

/**
 * Cancels a Return Order that hasn't been finalized yet — same "before
 * submission only" gate as updateReturnOrderAction, and for the same
 * reason: Received/Dispatched already moved real Stock, so there is
 * nothing left to safely cancel (that would need a real reversal, not a
 * cancel) — see the code-review note this was scoped down from ("bad
 * outbound → handle via adjustment", not an automatic reversal feature).
 * No stock effect ever applies here since a non-final order by definition
 * never had one yet.
 */
export async function cancelReturnOrderAction(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-return-orders", recordId);
  if (!existing) return { error: "Return Order not found." };
  if (isFinalReturnOrderStatus(existing["status"])) {
    return { error: `This Return Order is already ${existing["status"]} — it can no longer be cancelled.` };
  }

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, { ...existing, status: "Cancelled" });

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
}

export async function bulkImportReturnOrdersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getReturnOrderFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-return-orders", file, fields, async (values) => {
    const { error, normalized } = await applyReturnOrderStockEffect(partnerId, values);
    if (error) throw new Error(`Row for "${values["materialId"]}": ${error}`);
    return normalized;
  });
  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
