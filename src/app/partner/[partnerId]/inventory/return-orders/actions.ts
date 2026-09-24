"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import {
  getReturnOrderFormFields,
  getWarehouseOptionsForPartner,
  RETURN_ORDER_FINAL_STATUSES,
  RETURN_ORDER_INITIAL_STATUS,
  type ReturnOrderStageHistoryEntry,
} from "@/lib/sample-data/warehouse";
import { adjustStockQty, getQtyOnHand, type StockCondition } from "@/lib/inventoryStock";

function isFinalReturnOrderStatus(status: unknown): boolean {
  return (RETURN_ORDER_FINAL_STATUSES as readonly string[]).includes(String(status ?? ""));
}

/** Role-ish actor label for a stage transition — no real per-user identity in this single-login app, same convention getReturnOrderTimeline's fallback entries already use. */
function actorFor(direction: unknown): string {
  return direction === "Outbound" ? "Warehouse" : "Service Centre";
}

function appendStageHistory(existing: unknown, stage: string, actor: string): ReturnOrderStageHistoryEntry[] {
  const history = (Array.isArray(existing) ? existing : []) as ReturnOrderStageHistoryEntry[];
  return [...history, { at: new Date().toISOString(), stage, actor }];
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
 * Core "create one Return Order" logic, shared by the single-line action
 * below (createReturnOrderAction, kept for any caller still on a plain
 * one-line RecordForm) and createReturnOrdersMultiAction (the "add row"
 * multi-line-item create flow — see ReturnOrdersNewButton.tsx). Does NOT
 * redirect — that's the caller's job, once, after every line item in a
 * submission has been created (or the first error stops the loop early).
 */
async function createReturnOrderCore(
  partnerId: string,
  values: Record<string, unknown>
): Promise<{ error?: string; record?: Record<string, unknown> }> {
  // Status is never caller-supplied — a newly created Return Order always
  // starts at RETURN_ORDER_INITIAL_STATUS ("Pending", shown as "Created" in
  // the UI) regardless of whatever the form/CSV row/multi-line submission
  // happened to include. Every later stage only moves through the explicit
  // transition actions below (markReturnOrderInTransitAction,
  // warehouseInwardReturnOrderAction, dispatchReturnOrderAction,
  // rejectReturnOrderAction), never through a create/edit form field.
  const seeded = {
    ...values,
    status: RETURN_ORDER_INITIAL_STATUS,
    stageHistory: appendStageHistory(undefined, RETURN_ORDER_INITIAL_STATUS, actorFor(values["direction"])),
  };
  const { error, normalized } = await applyReturnOrderStockEffect(partnerId, seeded);
  if (error) return { error };
  const record = await createBusinessRecord(partnerId, "inventory-return-orders", normalized);
  return { record };
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

  const { error, record } = await createReturnOrderCore(partnerId, values);
  if (error) return { error };

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/return-orders/${record!["id"]}?created=1`);
}

/**
 * Multi-line-item create — one shared set of header fields (Direction,
 * Workorder, Source Location, Destination Warehouse, Vendor/OEM, Challan
 * Number, Status, Created Date) plus a row per material (Return Type,
 * Material, Quantity), exactly the "add row" pattern Billing's invoice
 * form already uses (see LineItemsEditor.tsx) — adapted here since a
 * Return Order line isn't priced, just material+condition+qty. Each line
 * becomes its OWN "inventory-return-orders" BusinessRecord (same shape a
 * single-line create already produces — no new field names, no schema
 * change), so every existing detail/edit/list page keeps working
 * unmodified; a "batch" is only a client-side grouping for entry
 * convenience, not a new persisted concept. Lines are applied in order;
 * on the first line that fails validation/stock, everything already
 * created in this submission stays created (each line is a real,
 * independent stock movement — the same as if they'd been entered one at
 * a time) and the error names which line/material failed so the user can
 * fix and resubmit just the remaining lines.
 */
export async function createReturnOrdersMultiAction(
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
    const { error, record } = await createReturnOrderCore(partnerId, values);
    if (error) {
      const label = String(lines[i]["materialId"] ?? `#${i + 1}`);
      return {
        error: `Line ${i + 1} (${label}): ${error}${createdIds.length > 0 ? ` — ${createdIds.length} earlier line(s) were already created.` : ""}`,
        createdIds,
      };
    }
    createdIds.push(String(record!["id"]));
  }

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/return-orders?created=${createdIds.length}`);
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

  // Status is no longer an editable field on this form — it can only move
  // via the explicit stage-transition actions below. Force it back to
  // whatever it already was so a crafted/stale submission can't smuggle a
  // status change (and therefore a stock effect) through this edit path.
  const { error, normalized } = await applyReturnOrderStockEffect(partnerId, {
    ...values,
    status: existing["status"],
    stageHistory: existing["stageHistory"],
  });
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

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, {
    ...existing,
    status: "Cancelled",
    stageHistory: appendStageHistory(existing["stageHistory"], "Cancelled", actorFor(existing["direction"])),
  });

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
}

/**
 * Inbound only — Pending ("Created") -> In Transit. Marks that the Service
 * Centre has actually shipped the material; no stock effect yet (nothing has
 * physically arrived at the Warehouse). Not reachable for Outbound (an
 * Outbound return goes straight from Pending to Dispatched — see
 * dispatchReturnOrderAction).
 */
export async function markReturnOrderInTransitAction(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-return-orders", recordId);
  if (!existing) return { error: "Return Order not found." };
  if (existing["direction"] !== "Inbound") return { error: "Only an Inbound Return Order can be marked In Transit." };
  if (existing["status"] !== "Pending") {
    return { error: `Can only mark In Transit from Created/Pending — this Return Order is ${existing["status"]}.` };
  }

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, {
    ...existing,
    status: "In Transit",
    stageHistory: appendStageHistory(existing["stageHistory"], "In Transit", actorFor(existing["direction"])),
  });

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
}

/**
 * Inbound only, terminal — Pending or In Transit -> Received. This is the
 * Warehouse's explicit "check and inward" action: the ONLY place stock is
 * actually added for an Inbound Return Order (via the existing, reused
 * applyReturnOrderStockEffect — same stock math as before, just triggered
 * here instead of an arbitrary form submission). Once this succeeds the
 * record is final (RETURN_ORDER_FINAL_STATUSES) and can never be edited,
 * re-inwarded, or have this action run again.
 */
export async function warehouseInwardReturnOrderAction(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-return-orders", recordId);
  if (!existing) return { error: "Return Order not found." };
  if (existing["direction"] !== "Inbound") return { error: "Only an Inbound Return Order can be inwarded by the Warehouse." };
  if (isFinalReturnOrderStatus(existing["status"]) || (existing["status"] !== "Pending" && existing["status"] !== "In Transit")) {
    return { error: `Can only inward from Created/Pending or In Transit — this Return Order is ${existing["status"]}.` };
  }

  const { error, normalized } = await applyReturnOrderStockEffect(partnerId, { ...existing, status: "Received" });
  if (error) return { error };

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, {
    ...normalized,
    stageHistory: appendStageHistory(existing["stageHistory"], "Received", "Warehouse"),
  });

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

/**
 * Outbound only, terminal — Pending -> Dispatched. The only path that can
 * reduce Defective stock (via the existing, reused applyReturnOrderStockEffect
 * — same validation/deduction as before: source Warehouse name, Vendor/OEM
 * name, and Challan Number are all still required). Once this succeeds the
 * record is final and can never be edited or dispatched again.
 */
export async function dispatchReturnOrderAction(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-return-orders", recordId);
  if (!existing) return { error: "Return Order not found." };
  if (existing["direction"] !== "Outbound") return { error: "Only an Outbound Return Order can be dispatched." };
  if (existing["status"] !== "Pending") {
    return { error: `Can only dispatch from Created/Pending — this Return Order is ${existing["status"]}.` };
  }

  const { error, normalized } = await applyReturnOrderStockEffect(partnerId, { ...existing, status: "Dispatched" });
  if (error) return { error };

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, {
    ...normalized,
    stageHistory: appendStageHistory(existing["stageHistory"], "Dispatched", "Warehouse"),
  });

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

/**
 * Either direction, terminal — Pending or In Transit -> Rejected. No stock
 * effect (nothing physically arrived/was accepted), so this never calls
 * applyReturnOrderStockEffect — a straight status + stageHistory update.
 */
export async function rejectReturnOrderAction(partnerId: string, recordId: string): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-return-orders", recordId);
  if (!existing) return { error: "Return Order not found." };
  if (isFinalReturnOrderStatus(existing["status"])) {
    return { error: `This Return Order is already ${existing["status"]} — it can no longer be rejected.` };
  }

  await updateBusinessRecord(partnerId, "inventory-return-orders", recordId, {
    ...existing,
    status: "Rejected",
    stageHistory: appendStageHistory(existing["stageHistory"], "Rejected", actorFor(existing["direction"])),
  });

  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/return-orders/${recordId}`);
}

export async function bulkImportReturnOrdersAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const fields = await getReturnOrderFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-return-orders", file, fields, async (values) => {
    // Same rule as a normal create — a bulk-imported row never gets to pick
    // its own status; it starts at RETURN_ORDER_INITIAL_STATUS and only
    // moves via the explicit stage-transition actions afterwards.
    const seeded = {
      ...values,
      status: RETURN_ORDER_INITIAL_STATUS,
      stageHistory: appendStageHistory(undefined, RETURN_ORDER_INITIAL_STATUS, actorFor(values["direction"])),
    };
    const { error, normalized } = await applyReturnOrderStockEffect(partnerId, seeded);
    if (error) throw new Error(`Row for "${values["materialId"]}": ${error}`);
    return normalized;
  });
  revalidatePath(`/partner/${partnerId}/inventory/return-orders`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
