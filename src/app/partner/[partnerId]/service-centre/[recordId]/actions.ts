"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import {
  extractLifecycleFromRecord,
  isUnderWarranty,
  WORKORDER_STAGES,
  PART_PENDING_STATUS_LABEL,
  type ServiceLine,
  type StageHistoryEntry,
  type WorkorderStage,
} from "@/lib/sample-data/service-centre";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getPartner } from "@/lib/partnerData";
import { notifyCentralApiBillingInvoice } from "@/lib/centralApi";
import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { sendWorkorderTelegramAlert, sendPartnerTelegramAlert } from "@/lib/telegram";
import { workorderClosedMessage, workorderCancelledMessage, lowStockAlertMessage } from "@/lib/telegramTemplates";
import { findStockRecord, adjustStockQty } from "@/lib/inventoryStock";

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

  // Estimate approval is intentionally NOT a precondition for entering "In
  // Progress" — AN-CRM's real job-sheet flow (Proceed for Repair /
  // Complete Repair & Invoice) has no equivalent gate, so this used to
  // block a transition the reference app allows unconditionally. The
  // estimate/approval feature itself (Mark Estimate Approved, the Estimate
  // card, Generate/Print Estimate) is unaffected — it simply no longer
  // blocks stage progression.

  if (nextStage === "Completed") {
    // No line-item requirement here: plenty of calls resolve without
    // consuming a part or a billable service (guidance-only, no-fault-found,
    // remote fix) and still need to be closeable. Handover simply produces
    // no Sales Invoice when there's nothing to bill, instead of blocking
    // completion.

    // A repair can't be marked completed without a diagnosed fault
    // solution — the engineer must select one (WorkorderLifecycle.tsx's
    // "Solution" dropdown). This is a plain field on the workorder record
    // itself (solutionId/solutionLabel), NOT stored on a ServiceLine —
    // a diagnosis is not a billable line item.
    if (!existing["solutionId"]) {
      throw new Error(
        "Select a Solution before marking the repair completed — the fault diagnosis/solution is required."
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
/**
 * Deducts every non-pending part line's quantity from live Inventory stock
 * when a workorder is completed. Fail-closed: if ANY line would consume
 * more than is actually on hand, nothing is deducted and the caller gets
 * an error instead of some lines silently going negative — same posture
 * completeSaleAction (POS) already uses. A serialized line always consumes
 * exactly 1 unit (a serial number identifies one physical unit, so a
 * serialized line's `qty` is not read for the deduction amount) and its
 * entered serial is recorded on the stock row's `consumedSerials` list for
 * traceability; a non-serialized line deducts its own `qty`.
 *
 * Gated entirely by Partner.serializedInventoryEnabled (the "Serialized
 * Inventory" toggle on /partner/<id>/settings). Off (the default) means
 * this is a complete no-op: free-text parts, BOM catalog parts, and their
 * pricing all flow through to Mark Completed/Close with no stock
 * validation or deduction at all — inventory tracking simply isn't part of
 * this partner's workflow. Only when explicitly turned on does this
 * fail-closed check/deduct against real stock.
 */
export async function deductInventoryForWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const record = await requireWorkorder(partnerId, workorderId);
  const lifecycle = extractLifecycleFromRecord(record);
  if (lifecycle.inventoryDeducted) return; // already deducted — don't double-count

  const partner = await getPartner(partnerId);
  if (!partner?.serializedInventoryEnabled) {
    await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
    return;
  }

  if (lifecycle.partLines.length === 0) {
    await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
    return;
  }

  // A part line is only stock-tracked when it was matched to a BOM catalog
  // item (materialId set) — see WorkorderLifecycle.tsx's setPartLabel():
  // typing a name that doesn't match anything is a deliberately supported
  // "free-text, unpriced" line, not an error state. Without this filter,
  // ANY workorder containing one would fail the stock pre-check below with
  // "0 available" (findStockRecord("") never matches a real stock row) and
  // Mark Completed would throw for every such job.
  const linesToConsume = lifecycle.partLines.filter((line) => !line.pending && line.materialId);

  // Fail-closed pre-check — every line must have enough stock before ANY of them are deducted.
  const shortages: string[] = [];
  for (const line of linesToConsume) {
    const stock = await findStockRecord(partnerId, line.materialId);
    const available = Number(stock?.["qtyOnHand"] ?? 0);
    const needed = line.serialized ? 1 : line.qty || 1;
    if (available < needed) {
      shortages.push(`${line.materialLabel || line.materialId}: ${available} available, ${needed} needed`);
    }
  }
  if (shortages.length > 0) {
    throw new Error(`Not enough stock to complete this job — ${shortages.join("; ")}.`);
  }

  for (const line of linesToConsume) {
    const needed = line.serialized ? 1 : line.qty || 1;
    const before = await findStockRecord(partnerId, line.materialId);
    const reorderLevel = Number(before?.["reorderLevel"] ?? 0);
    const currentQty = Number(before?.["qtyOnHand"] ?? 0);

    const newQty = await adjustStockQty(partnerId, line.materialId, line.materialLabel, String(before?.["warehouseName"] ?? ""), -needed);

    if (line.serialized && line.serial && before) {
      const consumedSerials = Array.isArray(before["consumedSerials"]) ? (before["consumedSerials"] as unknown[]) : [];
      await updateBusinessRecord(partnerId, "inventory-stock", String(before["id"]), {
        ...before,
        qtyOnHand: newQty,
        consumedSerials: [...consumedSerials, { serial: line.serial, workorderId, consumedAt: new Date().toISOString() }],
      });
    }

    // Fire once, right as stock crosses the threshold — not on every
    // subsequent deduction while it stays low, so this doesn't spam an
    // alert per workorder for a part nobody's reordered yet.
    if (partner && reorderLevel > 0 && currentQty > reorderLevel && newQty <= reorderLevel) {
      await sendPartnerTelegramAlert(
        partnerId,
        "lowStock",
        await lowStockAlertMessage({
          partnerBusinessName: partner.businessName,
          itemName: line.materialLabel || line.materialId,
          quantityRemaining: newQty,
          reorderThreshold: reorderLevel,
        })
      );
    }
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

  const underWarranty = isUnderWarranty(record);
  // Priced from the SAME buildServiceCentreLines() the printed Sales
  // Invoice, Estimate and Service Record all use, so the figure persisted
  // on this Billing record cannot disagree with the figure on the
  // documents. It previously recomputed its own subtotal inline and then
  // taxed it at a flat, rounded 18% — while every printed document taxed
  // each line at that line's OWN gstRate (the part's BOM taxPercent, which
  // is frequently 5% or 12%, not 18%). That is exactly the
  // persisted-vs-printed drift AN-CRM's serviceRecordToRenderData() reads
  // the persisted invoice to avoid; here the two are made to agree at the
  // source instead. buildServiceCentreLines() applies the identical
  // warranty-zeroing and exclude-Pending-parts rules this used to apply by
  // hand, so the subtotal itself is unchanged.
  const invoiceLines = await buildServiceCentreLines(partnerId, record);
  const subtotal = invoiceLines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
  const taxAmount = invoiceLines.reduce((sum, l) => sum + l.quantity * l.rate * (l.gstRate / 100), 0);
  const totalAmount = subtotal + taxAmount;

  // Assign the real invoice number ONCE, here, at actual invoice-creation
  // time — via the same atomic, persisted NumberingCounter every other
  // numbered document type uses (getNextNumber). Previously no number was
  // ever stored on the Billing record at all: the printed Sales Invoice
  // page recomputed a number on every render by counting this partner's
  // B2C/B2B workorder rows live (getBusinessRecordSequenceIndexFiltered),
  // which counts EVERY workorder ever created (invoiced or not, even
  // cancelled-but-not-deleted ones) rather than invoices actually issued —
  // that's why a partner's first real invoice could print as e.g.
  // "BILL-...-0013" instead of "...-0001", and why the number wasn't even
  // stable (it could shift if an earlier workorder was later deleted).
  // Shared scope with Billing's own direct "New Invoice" form
  // (businessRecordActions.ts) — "invoice.b2c"/"invoice.b2b", NOT a
  // Service-Centre-only key — so both origins draw from the same
  // per-partner sequence and can never hand out the same number twice.
  const isB2B = Boolean(String(record["customerGstin"] ?? "").trim());
  const numberingDocType = isB2B ? "invoice.b2b" : "invoice.b2c";
  const numberingDefaults = isB2B ? { prefix: "INV" } : { prefix: "BILL" };
  const { getNextNumber } = await import("@/lib/designer/numbering");
  const invoiceNumber = await getNextNumber(numberingDocType, partnerId, numberingDefaults);

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
  // Invoice date = handover date, not invoice-record-creation time — the
  // customer receives/pays at handover (confirmClose stamps handedOverAt
  // just before this runs), while this action can itself run slightly
  // later (or via Retry Invoice Creation, much later) than the actual
  // handover moment.
  const issueDate = (
    (record["handedOverAt"] as string | undefined) ?? new Date().toISOString()
  ).slice(0, 10);

  const invoice = await createBusinessRecord(partnerId, "billing", {
    invoiceNumber,
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
    // The real itemized lines, in Billing's own LineItem shape. Without
    // these the Billing-side document for a workorder-originated invoice
    // (billing/[recordId]/document) rendered an EMPTY item table — it
    // reads record["items"], which nothing ever wrote here, so only the
    // one-line lineItemsSummary above survived the handoff. Same lines the
    // Service Centre-side invoice prints, so the two documents for this
    // one invoice now show identical items.
    items: invoiceLines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.rate,
      taxRate: l.gstRate,
      hsnCode: l.hsn || undefined,
    })),
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
    invoiceSource: "Service Centre",
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

  // Same AN-Accounting push the generic createBusinessRecordAction makes
  // for a manually-created Billing invoice (src/lib/businessRecordActions.ts)
  // — this invoice is created directly via createBusinessRecord above so it
  // bypasses that hook, and without this call a Service Centre invoice would
  // never reach AN-Accounting at all. Best-effort: notifyCentralApiBillingInvoice
  // never throws, retries transient failures with backoff internally, and its
  // return value is ignored here (same as every other call site) — none of
  // that result feeds into what happens next in this function. So it's fired
  // without awaiting rather than blocking the user's "Close Workorder" click
  // on an external API's retry/backoff round-trip for a workorder that is
  // already closed and invoiced regardless of whether this sync succeeds.
  // `.catch` is a belt-and-braces guard against an unhandled rejection, not
  // because this is expected to reject (see notifyCentralApiBillingInvoice's
  // own "deliberately never throws" doc).
  const partner = await getPartner(partnerId);
  if (partner) {
    // Same lines persisted on the invoice above, rather than a third
    // hand-rolled rebuild that re-applied the warranty/pending rules and
    // hardcoded every taxRate to 18% — AN-Accounting was being told a
    // different tax rate than the invoice and the printed document carry.
    const items = invoiceLines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.rate,
      taxRate: l.gstRate,
    }));
    void notifyCentralApiBillingInvoice(partner, {
      externalOrderId: String(invoice.id),
      customer: String(record["customer"] ?? ""),
      customerGstin: record["customerGstin"] ? String(record["customerGstin"]) : undefined,
      customerState: record["customerState"] ? String(record["customerState"]) : undefined,
      items,
      totalAmount,
      issueDate,
    }).catch(() => {});
  }

  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    invoiceId: invoice.id,
    paymentCollected: collected || underWarranty,
    paymentMode: collected ? payment?.mode : undefined,
    paymentCollectedAmount: amountPaid,
    paymentCollectedAt: collected ? new Date().toISOString() : undefined,
  });

  if (partner) {
    await sendWorkorderTelegramAlert(
      partnerId,
      workorderId,
      "workorderClosed",
      await workorderClosedMessage({
        partnerBusinessName: partner.businessName,
        workorderNumber: workorderId,
        amount: `₹${totalAmount.toLocaleString("en-IN")}`,
        customerName: String(record["customer"] ?? ""),
        customerPhone: String(record["customerPhone"] ?? ""),
        brandName: String(record["brandName"] ?? ""),
        modelName: String(record["modelName"] ?? ""),
        engineerName: String(record["engineerName"] ?? ""),
        warrantyStatus: String(record["warrantyStatus"] ?? ""),
        remark: String(record["remark"] ?? ""),
      })
    );
  }

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

  const partner = await getPartner(partnerId);
  if (partner) {
    await sendWorkorderTelegramAlert(
      partnerId,
      workorderId,
      "workorderCancelled",
      await workorderCancelledMessage({
        partnerBusinessName: partner.businessName,
        workorderNumber: workorderId,
        reason: trimmedReason,
        customerName: String(record["customer"] ?? ""),
        customerPhone: String(record["customerPhone"] ?? ""),
        brandName: String(record["brandName"] ?? ""),
        modelName: String(record["modelName"] ?? ""),
        loggedBy: String(record["loggedBy"] ?? ""),
        receivedDate: String(record["receivedDate"] ?? ""),
      })
    );
  }

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
  // The legacy `status` field (serviceCentreColumns / serviceCentreFormFields)
  // is a completely separate value from the real onHold lifecycle side-state
  // and was never updated when a job went on/off hold — so the Workorders
  // list page (which renders `status` raw, not the stage/onHold-derived
  // milestone the detail page uses) kept showing whatever status was set at
  // intake even while the job was genuinely on hold waiting for a part.
  // Sync it here so the list — and anywhere else `status` is displayed —
  // reflects "Part Pending" while on hold, restoring whatever status was in
  // effect immediately before the hold once it's resumed.
  const extra: Record<string, unknown> = hold
    ? { statusBeforeHold: record["status"], status: PART_PENDING_STATUS_LABEL }
    : { status: record["statusBeforeHold"] ?? record["status"], statusBeforeHold: undefined };
  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    onHold: hold,
    holdReason: hold ? reason ?? "Awaiting parts" : undefined,
    holdSince: hold ? new Date().toISOString() : undefined,
    ...extra,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
}
