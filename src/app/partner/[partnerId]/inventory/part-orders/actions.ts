"use server";

import { withInventoryAction } from "@/lib/inventoryAction";

import { revalidatePath } from "next/cache";
import { redirectAfterInventoryWrite as redirect } from "@/lib/inventoryAction";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getPartOrderFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { adjustStockQty, getQtyOnHand, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";
import { recordInventoryTransaction } from "@/lib/inventoryLedger";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

/**
 * Core "create one Part Order" logic, shared by the single-line action
 * below (createPartOrderAction, kept for any caller still on a plain
 * one-line RecordForm) and createPartOrdersMultiAction (the "add row"
 * multi-line-item create flow — see PartOrdersNewButton.tsx). Always
 * creates "Pending" ("Waiting for Parts") — status is never caller-supplied
 * any more; it only moves via the explicit transition actions below
 * (dispatchPartOrderAction, receivePartOrderAction), same pattern Return
 * Orders already uses. No stock effect at creation — material hasn't left
 * the warehouse yet. Does NOT redirect — that's the caller's job, once,
 * after every line item in a submission has been created (or the first
 * error stops the loop early).
 */
async function createPartOrderCore(
  partnerId: string,
  values: Record<string, unknown>
): Promise<{ error?: string; record?: Record<string, unknown> }> {
  const materialId = String(values["materialId"] ?? "").trim();
  const sourceWarehouseName = String(values["sourceWarehouseName"] ?? "").trim();
  const quantity = Number(values["quantity"] ?? 0);
  const unitPrice = Number(values["unitPrice"] ?? 0);

  if (!materialId || !sourceWarehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, Source Warehouse and a positive Quantity are required." };
  }

  const record = await createBusinessRecord(partnerId, "inventory-part-orders", {
    ...values,
    unitPrice,
    status: "Pending",
    serialNumbers: [],
    dispatchedDate: null,
    deliveredDate: null,
  });

  return { record };
}

/**
 * Creates a Part Order — "Waiting for Parts" (Pending), no stock effect
 * yet. Material only actually leaves the source warehouse once
 * dispatchPartOrderAction runs, and the order only reaches its terminal
 * Delivered state (and posts its ledger entry) once receivePartOrderAction
 * runs — see those functions below.
 */
export async function createPartOrderAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  return withInventoryAction(partnerId, () => createPartOrderActionInner(partnerId, values));
}

async function createPartOrderActionInner(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const { error } = await createPartOrderCore(partnerId, values);
  if (error) return { error };

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

/**
 * Multi-line-item create — one shared set of header fields (Linked Return
 * Order, Source Warehouse, Destination Location, Status, Dispatched Date)
 * plus a row per material (Material, Quantity, Unit Price, Serial/Barcode
 * Numbers), the same "add row" pattern Return Orders/Stock Adjustments
 * already use (see MaterialLineItemsTable). Each line becomes its own
 * "inventory-part-orders" BusinessRecord and its own real Stock deduction
 * (once Dispatched/Delivered) — no new field names, existing detail/edit
 * pages keep working unmodified. Lines are applied in order; the first
 * line that fails stops the loop (earlier lines already created/applied in
 * this submission stay that way) and the error names which line/material
 * failed.
 */
export async function createPartOrdersMultiAction(
  partnerId: string,
  common: Record<string, unknown>,
  lines: Array<Record<string, unknown>>
): Promise<{ error?: string; createdIds?: string[] }> {
  return withInventoryAction(partnerId, () => createPartOrdersMultiActionInner(partnerId, common, lines));
}

async function createPartOrdersMultiActionInner(
  partnerId: string,
  common: Record<string, unknown>,
  lines: Array<Record<string, unknown>>
): Promise<{ error?: string; createdIds?: string[] }> {
  partnerId = await requireSessionPartnerId(partnerId);

  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one line item." };
  }

  const createdIds: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const values = { ...common, ...lines[i] };
    const { error, record } = await createPartOrderCore(partnerId, values);
    if (error) {
      const label = String(lines[i]["materialId"] ?? `#${i + 1}`);
      return {
        error: `Line ${i + 1} (${label}): ${error}${createdIds.length > 0 ? ` — ${createdIds.length} earlier line(s) were already created and applied.` : ""}`,
        createdIds,
      };
    }
    createdIds.push(String(record!["id"]));
  }

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/part-orders?created=${createdIds.length}`);
}

/**
 * A bulk-imported row never gets to pick its own status either — like a
 * normal create, it lands "Pending" ("Waiting for Parts") with no stock
 * effect; Dispatch/Deliver only happen afterwards via the explicit
 * transition actions on each row's own detail page.
 */
export async function bulkImportPartOrdersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getPartOrderFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-part-orders", file, fields, async (values) => {
    const unitPrice = Number(values["unitPrice"] ?? 0);
    return { ...values, unitPrice, status: "Pending", serialNumbers: [], dispatchedDate: null, deliveredDate: null };
  });
  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  return result;
}

/**
 * Pending ("Waiting for Parts") -> Dispatched. The only place material
 * actually leaves the source warehouse's real Stock — fail-closed on
 * availability. A serialized material needs one barcode/serial per unit
 * captured right here (the moment it physically leaves), count must match
 * Quantity exactly.
 */
export async function dispatchPartOrderAction(
  partnerId: string,
  recordId: string,
  serialNumbersRaw: string
): Promise<void | { error?: string }> {
  return withInventoryAction(partnerId, () => dispatchPartOrderActionInner(partnerId, recordId, serialNumbersRaw));
}

async function dispatchPartOrderActionInner(
  partnerId: string,
  recordId: string,
  serialNumbersRaw: string
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-part-orders", recordId);
  if (!existing) return { error: "Part Order not found." };
  if (existing["status"] !== "Pending") {
    return { error: `Can only dispatch from Waiting for Parts — this Part Order is ${existing["status"]}.` };
  }

  const materialId = String(existing["materialId"] ?? "").trim();
  const sourceWarehouseName = String(existing["sourceWarehouseName"] ?? "").trim();
  const quantity = Number(existing["quantity"] ?? 0);

  const available = await getQtyOnHand(partnerId, materialId, sourceWarehouseName);
  if (available < quantity) {
    return { error: `Cannot dispatch ${quantity} — only ${available} on hand at ${sourceWarehouseName}.` };
  }

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
  const serialNumbers = parseSerialNumbers(serialNumbersRaw);
  if (isSerialized) {
    const error = validateSerialNumbers(serialNumbers, quantity, materialId);
    if (error) return { error };
  }

  await adjustStockQty(partnerId, materialId, materialId, sourceWarehouseName, -quantity);

  await updateBusinessRecord(partnerId, "inventory-part-orders", recordId, {
    ...existing,
    status: "Dispatched",
    serialNumbers: isSerialized ? serialNumbers : [],
    dispatchedDate: new Date().toISOString().slice(0, 10),
  });

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/part-orders/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

/**
 * Dispatched -> Delivered, terminal. Stock already left the warehouse at
 * Dispatch — this only confirms the parts reached the Service Centre
 * location and posts the money ledger entry (debit — parts received,
 * unitPrice × quantity), same as the old "Delivered" effect, just moved to
 * its own explicit step instead of something settable at creation.
 */
export async function receivePartOrderAction(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  return withInventoryAction(partnerId, () => receivePartOrderActionInner(partnerId, recordId));
}

async function receivePartOrderActionInner(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-part-orders", recordId);
  if (!existing) return { error: "Part Order not found." };
  if (existing["status"] !== "Dispatched") {
    return { error: `Can only mark Delivered from Dispatched — this Part Order is ${existing["status"]}.` };
  }

  const materialId = String(existing["materialId"] ?? "").trim();
  const sourceWarehouseName = String(existing["sourceWarehouseName"] ?? "").trim();
  const quantity = Number(existing["quantity"] ?? 0);
  const unitPrice = Number(existing["unitPrice"] ?? 0);

  await updateBusinessRecord(partnerId, "inventory-part-orders", recordId, {
    ...existing,
    status: "Delivered",
    deliveredDate: new Date().toISOString().slice(0, 10),
  });

  await recordInventoryTransaction({
    partnerId,
    sourceType: "part-order",
    sourceRecordId: recordId,
    direction: "debit",
    amount: Math.round(unitPrice * 100) * quantity,
    description: `Part Order ${recordId} Delivered — ${quantity} x ${materialId} from ${sourceWarehouseName}`,
  });

  revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/part-orders/${recordId}`);
}
