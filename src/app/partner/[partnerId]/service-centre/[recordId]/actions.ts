"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import {
  extractLifecycleFromRecord,
  WORKORDER_STAGES,
  type ServiceLine,
  type StageHistoryEntry,
  type WorkorderStage,
} from "@/lib/sample-data/service-centre";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

/**
 * Shared lookup for every action below. Previously each action did
 * `if (!existing) return;` — a silent no-op, so a lifecycle button whose id
 * didn't resolve to a real record simply did nothing with no feedback at
 * all. Throwing surfaces the problem immediately (Next renders the Server
 * Action error) instead of leaving a dead button.
 */
async function requireWorkorder(partnerId: string, workorderId: string): Promise<Record<string, unknown>> {
  const existing = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!existing) {
    throw new Error(`Workorder "${workorderId}" not found — it may have been moved or deleted.`);
  }
  return existing;
}

/**
 * Appends a real stage transition to the record's `stageHistory`. This is
 * the only place transitions are logged, and it's what the activity
 * timeline renders from (getServiceCentreTimeline) — no actor/IP is stored
 * because the module has one login for the whole business, not per-user
 * accounts, so there is no real identity to attribute.
 */
function appendStageHistory(existing: Record<string, unknown>, stage: string): StageHistoryEntry[] {
  const history = (existing["stageHistory"] as StageHistoryEntry[] | undefined) ?? [];
  return [...history, { at: new Date().toISOString(), stage }];
}

/**
 * Tenant-isolation gate: every mutating action below calls this first.
 * Service Centre has a single login for the whole business (the partner
 * session — see requirePartnerSession.ts; the separate PartnerStaff
 * sign-in/sign-up flow this used to check has been removed), so this just
 * confirms the caller's session belongs to THIS exact partnerId. Does NOT
 * implement a per-role permission matrix (assign vs. start vs. complete vs.
 * cancel) — anyone signed in as this partner can perform every action here,
 * which matches "one login for the business" rather than per-staff-member
 * accounts.
 */
async function assertCanActOnServiceCentre(partnerId: string): Promise<void> {
  await requireSessionPartnerId(partnerId);
}

/**
 * Server-side stage-transition rules — previously these lived ONLY in
 * WorkorderLifecycle.tsx's advanceStage() (client-side), so a crafted
 * request straight to patchServiceCentreWorkorderAction with
 * `{ stage: "Closed" }` could skip the estimate-approval gate or the
 * unresolved-serial check entirely. This mirrors the client's own rules
 * (kept in sync deliberately) so the UI and the server never disagree, but
 * the server's copy is the one that can't be bypassed.
 */
function assertLegalStageTransition(
  existing: Record<string, unknown>,
  nextStage: WorkorderStage
): void {
  const currentStage = (existing["stage"] as WorkorderStage | undefined) ?? "Created";
  if (nextStage === currentStage) return; // no-op patch (e.g. re-saving other fields alongside the current stage)

  // Cancelled is a terminal side-branch, not a point on the linear stage
  // sequence — a job can be abandoned from Created / In Progress /
  // Completed alike, so it's exempt from the "next stage only" rule below.
  // It is still terminal: nothing moves out of Cancelled (or Closed).
  if (existing["cancelledAt"]) {
    throw new Error("This workorder has been cancelled — its stage can no longer be changed.");
  }

  const currentIdx = WORKORDER_STAGES.indexOf(currentStage);
  const nextIdx = WORKORDER_STAGES.indexOf(nextStage);
  if (nextIdx !== currentIdx + 1) {
    throw new Error(`Cannot move workorder from "${currentStage}" directly to "${nextStage}" — stages can't be skipped or reversed.`);
  }

  if (nextStage === "In Progress") {
    const underWarranty = Boolean(existing["warrantyFlag"]);
    const approved = Boolean(existing["estimateApproved"]);
    if (!underWarranty && !approved) {
      throw new Error("The customer must approve the estimate before repair work starts.");
    }
  }

  if (nextStage === "Completed") {
    // Mirrors the reference app's close route ("Cannot close a job sheet
    // with no line items — add at least one before closing"): a repair that
    // consumed no part and performed no service has nothing to invoice, and
    // letting it through produces an empty Sales Invoice at handover.
    // Warranty jobs are exempt from being CHARGED, not from being recorded.
    const partLines = (existing["partLines"] as unknown[] | undefined) ?? [];
    const serviceLines = (existing["serviceLines"] as unknown[] | undefined) ?? [];
    if (partLines.length === 0 && serviceLines.length === 0) {
      throw new Error(
        "This workorder has no parts or service lines — add at least one before marking the repair completed."
      );
    }
  }

  if (nextStage === "Closed") {
    const partLines = (existing["partLines"] as { serialized?: boolean; serial?: string; pending?: boolean }[] | undefined) ?? [];
    const unresolvedSerials = partLines.filter((p) => p.serialized && !p.serial && !p.pending);
    if (unresolvedSerials.length > 0) {
      throw new Error(
        `${unresolvedSerials.length} part line(s) are serialized but missing a Serial/IMEI number. Enter the serial or mark the line Pending before closing.`
      );
    }
  }
}

/**
 * Service-Centre-specific replacement for the generic patchBusinessRecordAction
 * — same merge-and-persist behavior, but gated by assertCanActOnServiceCentre
 * first, and — when the patch includes a `stage` change — validated against
 * assertLegalStageTransition so the state machine can't be bypassed by a
 * direct call. Used by WorkorderLifecycle for every lifecycle patch (stage
 * transitions, brand/model selection, engineer/collected-by names, parts/service lines,
 * handover notes) instead of calling the generic action directly.
 */
export async function patchServiceCentreWorkorderAction(
  partnerId: string,
  workorderId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const existing = await requireWorkorder(partnerId, workorderId);
  const extra: Record<string, unknown> = {};
  if (typeof patch["stage"] === "string") {
    const nextStage = patch["stage"] as WorkorderStage;
    assertLegalStageTransition(existing, nextStage);
    if (nextStage !== existing["stage"]) {
      // Log the real transition so the activity timeline has something
      // true to render instead of fabricating a history.
      extra["stageHistory"] = appendStageHistory(existing, nextStage);
    }
  }
  if (patch["estimateApproved"] === true && !existing["estimateApproved"]) {
    extra["customerApprovalAt"] = new Date().toISOString();
  }
  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...existing, ...patch, ...extra });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
}

/**
 * Deducts consumed part-line quantities from live Inventory stock
 * ("inventory-stock" module, keyed by BOM material id — same module/keying
 * completeSaleAction in pos/checkout/actions.ts already deducts against),
 * fired once per workorder as a side effect of the Completed stage
 * transition (mirrors how POS checkout deducts at sale completion). Read-
 * modify-write against BusinessRecord's JSON blob — same documented
 * limitation as completeSaleAction, not a DB-level atomic decrement.
 * Guarded by `inventoryDeducted` on the workorder record so re-entering
 * Completed (e.g. after a later edit) never double-deducts.
 */
export async function deductInventoryForWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const record = await requireWorkorder(partnerId, workorderId);
  const lifecycle = extractLifecycleFromRecord(record);
  if (lifecycle.inventoryDeducted) return; // already deducted — don't double-count
  if (lifecycle.partLines.length === 0) {
    await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
    return;
  }

  const stockRecords = await listBusinessRecords(partnerId, "inventory-stock");
  const stockById = new Map(stockRecords.map((r) => [String(r["id"]), r]));

  for (const line of lifecycle.partLines) {
    if (line.pending) continue; // never fulfilled — nothing to deduct
    const stock = stockById.get(line.materialId);
    if (!stock) continue; // no matching stock record — best-effort, doesn't block the job
    const currentQty = Number(stock["quantityOnHand"] ?? 0);
    const newQty = Math.max(0, currentQty - (line.qty || 1));
    await updateBusinessRecord(partnerId, "inventory-stock", line.materialId, { ...stock, quantityOnHand: newQty });
    stockById.set(line.materialId, { ...stock, quantityOnHand: newQty });
  }

  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
}

/**
 * Persists a real Billing invoice from a Closed workorder's lines —
 * distinct from the read-only computed render at
 * service-centre/[recordId]/invoice/page.tsx, which still shows the
 * document itself. Warranty jobs (warrantyFlag on the workorder record)
 * are non-chargeable: every line's amount is zeroed here rather than
 * silently charging a warranty repair, mirroring the same rule an
 * out-of-warranty job's charges depend on.
 *
 * Bind with .bind(null, partnerId, workorderId) before calling from a
 * client button.
 */
export async function createInvoiceFromWorkorderAction(
  partnerId: string,
  workorderId: string,
  /**
   * Payment captured at handover. Previously a non-warranty job's invoice
   * was always left at paymentStatus "Draft" with no amount or mode ever
   * recorded, so collecting the money was an untracked manual follow-up and
   * the dashboard counted uncollected invoices as revenue. When `collected`
   * is set, the invoice is marked Paid AND a matching "billing-payments"
   * record is created (same shape the Billing > Payments form writes).
   */
  payment?: { collected: boolean; mode?: string; amount?: number }
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const record = await requireWorkorder(partnerId, workorderId);
  const lifecycle = extractLifecycleFromRecord(record);
  if (lifecycle.stage !== "Closed") return;
  if (lifecycle.invoiceId) return; // already invoiced — don't double-create

  const underWarranty = Boolean(record["warrantyFlag"]);
  const laborTotal = underWarranty ? 0 : lifecycle.serviceLines.reduce((sum, l) => sum + (l.laborCharge || 0), 0);
  // Parts were previously never billed at all (hardcoded to 0) — a
  // workorder could consume real inventory and still invoice for labor
  // only. Each PartLine already carries its own unitPrice/qty (see
  // service-centre.ts), so bill fulfilled lines (not ones marked Pending —
  // never actually supplied) at qty * unitPrice, same warranty rule as labor.
  const partsTotal = underWarranty
    ? 0
    : lifecycle.partLines.reduce((sum, p) => (p.pending ? sum : sum + (p.unitPrice || 0) * (p.qty || 1)), 0);
  const subtotal = laborTotal + partsTotal;
  const taxAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + taxAmount;

  const partsSummary = lifecycle.partLines
    .filter((p) => !p.pending)
    .map((p) => `${p.materialLabel} x${p.qty} (₹${(p.unitPrice || 0) * (p.qty || 1)})`);
  const lineSummary = underWarranty
    ? `Warranty repair — no charge (${lifecycle.serviceLines.length} service line(s), ${lifecycle.partLines.length} part line(s))`
    : [...lifecycle.serviceLines.map((l: ServiceLine) => `${l.solutionLabel} (₹${l.laborCharge})`), ...partsSummary].join(", ");

  // A warranty job is non-chargeable (₹0), so it is trivially settled.
  // Otherwise the paid amount is whatever was actually collected at
  // handover — defaulting to the invoice total when the operator ticked
  // "payment collected" without overriding the amount.
  const collected = Boolean(payment?.collected) && !underWarranty;
  const collectedAmount = collected
    ? Math.max(0, Math.min(totalAmount, Number(payment?.amount ?? totalAmount) || 0))
    : 0;
  const amountPaid = underWarranty ? totalAmount : collectedAmount;
  const amountDue = totalAmount - amountPaid;
  const issueDate = new Date().toISOString().slice(0, 10);

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["customer"] ?? "",
    // Carried over from the workorder's intake block so the Billing
    // invoice knows who it's billed to (and whether it's B2B) instead of
    // holding a bare customer name — see serviceCentreFormFields.
    customerPhone: record["customerPhone"] ?? "",
    customerGstin: record["customerGstin"] ?? "",
    customerAddress: record["customerAddress"] ?? "",
    customerCity: record["customerCity"] ?? "",
    customerState: record["customerState"] ?? "",
    customerPincode: record["customerPincode"] ?? "",
    issueDate,
    dueDate: issueDate,
    lineItemsSummary: lineSummary || "No chargeable lines",
    subtotal,
    taxAmount,
    discountAmount: 0,
    roundOff: 0,
    totalAmount,
    amountPaid,
    amountDue,
    paymentStatus: amountDue <= 0 ? "Paid" : amountPaid > 0 ? "Partially Paid" : "Draft",
    paymentMode: collected ? payment?.mode : undefined,
    sourceWorkorderId: workorderId,
  });

  // Mirror the Billing > Payments record the manual form would have
  // created, so the money shows up in the outstanding/statement reports
  // rather than only as a field on the invoice.
  if (collected && collectedAmount > 0) {
    await createBusinessRecord(partnerId, "billing-payments", {
      invoiceId: invoice.id,
      contact: record["customer"] ?? "",
      amount: collectedAmount,
      mode: payment?.mode ?? "Cash",
      date: issueDate,
      reference: `Collected at handover — workorder ${workorderId}`,
    });
    revalidatePath(`/partner/${partnerId}/billing/payments`);
  }

  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    invoiceId: invoice.id,
    paymentCollected: collected || underWarranty,
    paymentMode: collected ? payment?.mode : undefined,
    paymentCollectedAmount: amountPaid,
    paymentCollectedAt: collected ? new Date().toISOString() : undefined,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}/invoice`);
  revalidatePath(`/partner/${partnerId}/billing`);
}

/**
 * Terminal cancellation of a workorder — the "CANCELLED" milestone
 * (MILESTONE_STATUSES in service-centre.ts) previously had no way of ever
 * being reached: no action, no button, no reason field. A reason is
 * mandatory, since a cancelled job with no explanation is useless for the
 * later "why did this never get done" question.
 *
 * Bind with .bind(null, partnerId, workorderId) before calling from a
 * client button.
 */
export async function cancelWorkorderAction(
  partnerId: string,
  workorderId: string,
  reason: string
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const trimmedReason = (reason ?? "").trim();
  if (!trimmedReason) {
    throw new Error("A cancellation reason is required.");
  }
  const record = await requireWorkorder(partnerId, workorderId);
  if (record["cancelledAt"]) {
    throw new Error("This workorder has already been cancelled.");
  }
  if (record["stage"] === "Closed") {
    throw new Error("A closed workorder can no longer be cancelled.");
  }

  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    cancelReason: trimmedReason,
    cancelledAt: new Date().toISOString(),
    onHold: false,
    holdReason: undefined,
    holdSince: undefined,
    stageHistory: appendStageHistory(record, "Cancelled"),
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
}

/**
 * Toggles the workorder's Hold (Parts Pending) side-state — separate from
 * the four main lifecycle stages, mirroring a job that's paused mid-repair
 * waiting on a spare rather than cancelled or actually progressing.
 */
export async function setWorkorderHoldAction(
  partnerId: string,
  workorderId: string,
  hold: boolean,
  reason?: string
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const record = await requireWorkorder(partnerId, workorderId);
  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    onHold: hold,
    holdReason: hold ? reason ?? "Awaiting parts" : undefined,
    holdSince: hold ? new Date().toISOString() : undefined,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
}
