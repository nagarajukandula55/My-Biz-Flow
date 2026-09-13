"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { extractLifecycleFromRecord, WORKORDER_STAGES, type ServiceLine, type WorkorderStage } from "@/lib/sample-data/service-centre";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

/**
 * Tenant-isolation gate: every mutating action below calls this first.
 * Service Centre has a single login for the whole business (the partner
 * session — see requirePartnerSession.ts; the separate PartnerStaff
 * sign-in/sign-up flow this used to check has been removed), so this just
 * confirms the caller's session belongs to THIS exact partnerId. Does NOT
 * implement a per-role permission matrix (assign vs. start vs. complete vs.
 * cancel) — anyone signed in as this partner can perform every action here,
 * which matches "one login for the business" rather than per-technician
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
 * transitions, brand/model/technician assignment, parts/service lines,
 * handover notes) instead of calling the generic action directly.
 */
export async function patchServiceCentreWorkorderAction(
  partnerId: string,
  workorderId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const existing = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!existing) return;
  if (typeof patch["stage"] === "string") {
    assertLegalStageTransition(existing, patch["stage"] as WorkorderStage);
  }
  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...existing, ...patch });
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
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
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
export async function createInvoiceFromWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
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

  const amountPaid = underWarranty ? totalAmount : 0;
  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["customer"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: lineSummary || "No chargeable lines",
    subtotal,
    taxAmount,
    discountAmount: 0,
    roundOff: 0,
    totalAmount,
    amountPaid,
    amountDue: totalAmount - amountPaid,
    paymentStatus: underWarranty ? "Paid" : "Draft",
    paymentMode: undefined,
    sourceWorkorderId: workorderId,
  });

  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, invoiceId: invoice.id });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}/invoice`);
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
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    onHold: hold,
    holdReason: hold ? reason ?? "Awaiting parts" : undefined,
    holdSince: hold ? new Date().toISOString() : undefined,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
}
