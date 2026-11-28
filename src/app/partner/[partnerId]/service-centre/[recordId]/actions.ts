"use server";

import { WorkorderValidationError } from "@/lib/workorderActionResult";
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
import { workorderClosedMessage, workorderCancelledMessage, lowStockAlertMessage, pnaLoggedMessage } from "@/lib/telegramTemplates";
import { adjustExistingStockRecordQty, adjustStockQty, getAvailableStockRows, materialCode, moveDefectiveToGood, type AvailableStockRow } from "@/lib/inventoryStock";
import { withRecordLock } from "@/lib/withRecordLock";
import { isWorkorderReopenUnlocked, consumeWorkorderReopenUnlock } from "@/lib/workorderReopenAccess";

/**
 * Every mutating action below runs its actual read-modify-write body
 * through this — see withRecordLock.ts. This app has one login per
 * business, not per staff member, so two people acting on the same
 * workorder from two different sessions at once is the normal case, not
 * an edge case; without this, concurrent patch/cancel/hold/deduct-
 * inventory/create-invoice calls could double-deduct stock or silently
 * overwrite each other's edit (each reads the record, merges its own
 * change, writes the whole thing back — no version check).
 */
function withWorkorderLock<T>(workorderId: string, fn: () => Promise<T>): Promise<T> {
  return withRecordLock("service-centre-workorder", workorderId, fn);
}

export type WorkorderAdvancePayment = {
  id: string;
  amount: number;
  mode: string;
  reference?: string;
  receivedAt: string;
};

function workorderAdvancePayments(record: Record<string, unknown>): WorkorderAdvancePayment[] {
  if (!Array.isArray(record["advancePayments"])) return [];
  return record["advancePayments"].flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const payment = value as Record<string, unknown>;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) return [];
    return [{
      id: String(payment.id ?? ""),
      amount: Math.round(amount * 100) / 100,
      mode: String(payment.mode ?? "Cash"),
      reference: typeof payment.reference === "string" ? payment.reference : undefined,
      receivedAt: typeof payment.receivedAt === "string" ? payment.receivedAt : new Date().toISOString(),
    }];
  });
}

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
    throw new WorkorderValidationError(`Workorder "${workorderId}" not found — it may have been moved or deleted.`);
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
async function assertLegalStageTransition(
  partnerId: string,
  existing: Record<string, unknown>,
  nextStage: WorkorderStage
): Promise<void> {
  const currentStage = (existing["stage"] as WorkorderStage | undefined) ?? "Created";
  if (nextStage === currentStage) return; // no-op patch (e.g. re-saving other fields alongside the current stage)

  // Cancelled is a terminal side-branch, not a point on the linear stage
  // sequence — a job can be abandoned from Created / In Progress /
  // Completed alike, so it's exempt from the "next stage only" rule below.
  // It is still terminal: nothing moves out of Cancelled (or Closed).
  if (existing["cancelledAt"]) {
    throw new WorkorderValidationError("This workorder has been cancelled — its stage can no longer be changed.");
  }

  const currentIdx = WORKORDER_STAGES.indexOf(currentStage);
  const nextIdx = WORKORDER_STAGES.indexOf(nextStage);
  if (nextIdx !== currentIdx + 1) {
    throw new WorkorderValidationError(`Cannot move workorder from "${currentStage}" directly to "${nextStage}" — stages can't be skipped or reversed.`);
  }

  // Estimate approval is intentionally NOT a precondition for entering "In
  // Progress" — AN-CRM's real job-sheet flow (Proceed for Repair /
  // Complete Repair & Invoice) has no equivalent gate, so this used to
  // block a transition the reference app allows unconditionally. The
  // estimate/approval feature itself (Mark Estimate Approved, the Estimate
  // card, Generate/Print Estimate) is unaffected — it simply no longer
  // blocks stage progression.

  // OOW repairs must have a real, positive bill BEFORE they can be marked
  // completed. This deliberately applies to both Completed and Closed: it
  // protects the normal lifecycle as well as any direct request that tries
  // to skip ahead.
  if ((nextStage === "Completed" || nextStage === "Closed") && !isUnderWarranty(existing)) {
    const chargeableLines = await buildServiceCentreLines(partnerId, existing);
    const chargeableTotal = chargeableLines.reduce(
      (sum, line) => sum + line.quantity * line.rate * (1 + line.gstRate / 100),
      0
    );
    if (chargeableTotal <= 0) {
      throw new WorkorderValidationError(
        "Out-of-warranty workorders require a billable part or service line greater than ₹0 before the repair can be marked completed."
      );
    }
  }

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
      throw new WorkorderValidationError(
        "Select a Solution before marking the repair completed — the fault diagnosis/solution is required."
      );
    }
  }

  if (nextStage === "Completed" || nextStage === "Closed") {
    // BOM/material serialization and Settings-level strict inventory are
    // separate controls. A catalog item marked Serialized always requires a
    // serial/IMEI; the partner setting only decides whether stock shortage
    // itself blocks completion.
    const partLines = (existing["partLines"] as { serialized?: boolean; serial?: string; pending?: boolean }[] | undefined) ?? [];
    const unresolvedSerials = partLines.filter((p) => p.serialized && !p.serial && !p.pending);
    if (unresolvedSerials.length > 0) {
      throw new WorkorderValidationError(
        `${unresolvedSerials.length} part line(s) are serialized but missing a Serial/IMEI number. Enter the serial or mark the line Pending before completing or closing the repair.`
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
  await withWorkorderLock(workorderId, async () => {
    const existing = await requireWorkorder(partnerId, workorderId);
    const extra: Record<string, unknown> = {};
    if (typeof patch["stage"] === "string") {
      const nextStage = patch["stage"] as WorkorderStage;
      await assertLegalStageTransition(partnerId, existing, nextStage);
      if (nextStage !== existing["stage"]) {
        // Log the real transition so the activity timeline has something
        // true to render instead of fabricating a history.
        extra["stageHistory"] = appendStageHistory(existing, nextStage);
      }
    }
    // Warranty is an intake decision.  Once repair has started it cannot be
    // changed through the generic patch action; the narrowly-scoped,
    // auditable void action below is the one exception (IW -> OOW only).
    if (
      (Object.prototype.hasOwnProperty.call(patch, "warrantyStatus") || Object.prototype.hasOwnProperty.call(patch, "warrantyFlag")) &&
      existing["stage"] !== "Created"
    ) {
      throw new WorkorderValidationError("Warranty status is locked once repair has started. Use the one-time Void Warranty action for an IW workorder.");
    }
    if (patch["estimateApproved"] === true && !existing["estimateApproved"]) {
      extra["customerApprovalAt"] = new Date().toISOString();
    }
    await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...existing, ...patch, ...extra });
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  // A workorder closing with a part still marked Not Available means that
  // job proceeded without ever getting the part (worked around another
  // way, or the customer moved on) — its PNA entry is no longer something
  // staff need to chase, but it also isn't the same outcome as actually
  // sourcing the part, so it gets its own distinct status rather than
  // silently becoming indistinguishable from a real "Fulfilled".
  if (patch["stage"] === "Closed") {
    await closeLinkedPnaEntries(partnerId, workorderId);
  }
}

/** Records money actually received before repair begins. It is deliberately
 * immutable rather than an editable balance: the final invoice consumes the
 * receipt as an adjustment and creates the matching Billing payment records. */
export async function recordWorkorderAdvancePaymentAction(
  partnerId: string,
  workorderId: string,
  payment: { amount: number; mode: string; reference?: string }
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const amount = Math.round(Number(payment.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new WorkorderValidationError("Enter an advance amount greater than ₹0.");
  if (!payment.mode?.trim()) throw new WorkorderValidationError("Select how the advance was received.");
  await withWorkorderLock(workorderId, async () => {
    const record = await requireWorkorder(partnerId, workorderId);
    if (record["cancelledAt"] || record["stage"] !== "Created" || record["invoiceId"]) {
      throw new WorkorderValidationError("Advance can be recorded only before this workorder proceeds for repair.");
    }
    const advances = workorderAdvancePayments(record);
    const advance: WorkorderAdvancePayment = {
      id: `ADV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount,
      mode: payment.mode.trim(),
      reference: payment.reference?.trim() || undefined,
      receivedAt: new Date().toISOString(),
    };
    await updateBusinessRecord(partnerId, "service-centre", workorderId, {
      ...record,
      advancePayments: [...advances, advance],
      advanceTotal: Math.round((advances.reduce((sum, item) => sum + item.amount, 0) + amount) * 100) / 100,
    });
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
}

/**
 * One-time conversion of an in-warranty repair into an out-of-warranty
 * repair.  Kept separate from the generic patch endpoint so a partner cannot
 * toggle warranty status back and forth or alter it after the event.
 */
export async function voidWorkorderWarrantyAction(partnerId: string, workorderId: string): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  await withWorkorderLock(workorderId, async () => {
    const record = await requireWorkorder(partnerId, workorderId);
    if (record["cancelledAt"] || record["stage"] === "Closed") {
      throw new WorkorderValidationError("Warranty cannot be voided for a cancelled or closed workorder.");
    }
    if (record["stage"] !== "In Progress") {
      throw new WorkorderValidationError("Warranty can be voided only after repair has been started.");
    }
    if (record["warrantyStatus"] !== "IW" || record["warrantyVoidedAt"]) {
      throw new WorkorderValidationError("Only an active IW warranty can be voided, and it can be voided only once.");
    }
    const at = new Date().toISOString();
    await updateBusinessRecord(partnerId, "service-centre", workorderId, {
      ...record,
      warrantyStatus: "OOW",
      warrantyFlag: false,
      warrantyVoidedAt: at,
      warrantyVoidedFrom: "IW",
      stageHistory: [...appendStageHistory(record, "Warranty voided (IW → OOW)"), { at, stage: "OOW billing now required before closure" }],
    });
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
}

async function closeLinkedPnaEntries(partnerId: string, workorderId: string): Promise<void> {
  const pnaRows = await listBusinessRecords(partnerId, "service-centre-pna");
  const open = pnaRows.filter((r) => r["workorderId"] === workorderId && r["status"] === "Open");
  for (const row of open) {
    await updateBusinessRecord(partnerId, "service-centre-pna", String(row["id"]), {
      ...row,
      status: "Closed (Workorder Closed)",
    });
  }
  if (open.length > 0) revalidatePath(`/partner/${partnerId}/service-centre/pna`);
}

/**
 * Deducts consumed part-line quantities from live Inventory stock
 * ("inventory-stock" module, keyed by BOM material id), fired once per
 * workorder as a side effect of the Completed stage transition. Service
 * Centre is its own standalone module — not connected to POS or any other
 * vertical, only to the cross-cutting Inventory infrastructure every
 * module shares (see src/lib/inventoryStock.ts). Read-modify-write against
 * BusinessRecord's JSON blob — a documented limitation, not a DB-level
 * atomic decrement.
 * Guarded by `inventoryDeducted` on the workorder record so re-entering
 * Completed (e.g. after a later edit) never double-deducts. Every line
 * actually deducted also gets its own "inventory-consumption" record (see
 * bottom of the loop) — a real, queryable history of what got used on
 * which job, for the Inventory > Parts Consumption report.
 *
 * Real quantity ALWAYS gets deducted here — this used to be a complete
 * no-op whenever Partner.serializedInventoryEnabled (the "Serialized
 * Inventory" toggle) was off, the default, which meant every workorder
 * closed under default settings never actually consumed stock at all, no
 * matter how many parts it used. That was correct for what was asked at
 * the time (don't let missing serial numbers or a stock shortage block a
 * job from closing when a partner isn't tracking serials), but it also
 * meant real consumption silently never happened. Fixed: the toggle now
 * only controls how STRICT this is —
 *  - ON: fail-closed (a shortage blocks the whole deduction, same as
 *    before) and a serialized line's entered serial is recorded.
 *  - OFF (default): deducts the quantity that is physically available
 *    across all warehouses, without blocking closure for any uncovered
 *    shortage. It never fabricates a
 *    consumption/Defective-stock entry for quantity that was not on hand.
 * Material-catalog serialization is independent: a serialized line always
 * requires its serial before Completed/Closed and that serial is retained in
 * consumption history in either strict-inventory mode.
 * A serialized line always consumes exactly 1 unit regardless of either
 * mode (a serial number identifies one physical unit, so its `qty` isn't
 * read for the deduction amount); a non-serialized line deducts its own
 * `qty`.
 */
export async function deductInventoryForWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  // The check-then-deduct sequence below reads current stock, then writes
  // new quantities in a later loop — two concurrent calls for the SAME
  // workorder (double-click, two staff sessions) could otherwise both pass
  // the pre-check against the same snapshot and both deduct, double-
  // consuming stock that adjustStockQty's floor-at-zero would then silently
  // absorb instead of reject. The lock also protects the final `{ ...record,
  // inventoryDeducted: true }` write from clobbering an unrelated field
  // edited by a second session while this ran.
  await withWorkorderLock(workorderId, async () => {
    const record = await requireWorkorder(partnerId, workorderId);
    const lifecycle = extractLifecycleFromRecord(record);
    if (lifecycle.inventoryDeducted) return; // already deducted — don't double-count

    const partner = await getPartner(partnerId);
    const strict = Boolean(partner?.serializedInventoryEnabled);

    if (lifecycle.partLines.length === 0) {
      await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
      return;
    }

    // A part line is only stock-tracked when it was matched to a BOM
    // catalog item (materialId set) — see WorkorderLifecycle.tsx's
    // setPartLabel(): typing a name that doesn't match anything is a
    // deliberately supported "free-text, unpriced" line, not an error
    // state. Without this filter, ANY workorder containing one would fail
    // the stock pre-check below with "0 available" (findStockRecord("")
    // never matches a real stock row) and Mark Completed would throw for
    // every such job.
    const linesToConsume = lifecycle.partLines.filter((line) => !line.pending && line.materialId);

    // The availability check and every deduction share the partner-level
    // inventory lock. This prevents another workorder from consuming the
    // same stock after this one has checked it but before it writes.
    await withRecordLock("inventory-partner", partnerId, async () => {
      type PlannedAllocation = { line: (typeof linesToConsume)[number]; stock: AvailableStockRow; qty: number };
      const planned: PlannedAllocation[] = [];
      const bucketsByMaterial = new Map<string, AvailableStockRow[]>();
      const remainingByStockRecord = new Map<string, number>();

      for (const line of linesToConsume) {
        const code = materialCode(line.materialId);
        let buckets = bucketsByMaterial.get(code);
        if (!buckets) {
          buckets = await getAvailableStockRows(partnerId, code);
          bucketsByMaterial.set(code, buckets);
          for (const bucket of buckets) remainingByStockRecord.set(String(bucket.row["id"]), bucket.available);
        }

        const needed = line.serialized ? 1 : Math.max(1, line.qty || 1);
        const available = buckets.reduce(
          (sum, bucket) => sum + (remainingByStockRecord.get(String(bucket.row["id"])) ?? 0),
          0
        );
        if (strict && available < needed) {
          throw new WorkorderValidationError(
            `Not enough stock to complete this job - ${line.materialLabel || line.materialId}: ${available} available, ${needed} needed.`
          );
        }

        // Strict mode reaches here only when the entire line is covered.
        // Non-strict mode allocates whatever genuinely exists and leaves an
        // uncovered shortage unlogged, allowing the call to close without
        // inventing stock movements.
        let remainingNeed = Math.min(needed, available);
        for (const bucket of buckets) {
          if (remainingNeed <= 0) break;
          const recordId = String(bucket.row["id"]);
          const bucketRemaining = remainingByStockRecord.get(recordId) ?? 0;
          const take = Math.min(bucketRemaining, remainingNeed);
          if (take <= 0) continue;
          planned.push({ line, stock: bucket, qty: take });
          remainingByStockRecord.set(recordId, bucketRemaining - take);
          remainingNeed -= take;
        }
      }

      const allocationsByStockRecord = new Map<string, { stock: AvailableStockRow; qty: number; allocations: PlannedAllocation[] }>();
      for (const allocation of planned) {
        const recordId = String(allocation.stock.row["id"]);
        const group = allocationsByStockRecord.get(recordId) ?? { stock: allocation.stock, qty: 0, allocations: [] };
        group.qty += allocation.qty;
        group.allocations.push(allocation);
        allocationsByStockRecord.set(recordId, group);
      }

      const customerName = typeof record["customer"] === "string" ? (record["customer"] as string) : "";
      for (const [stockRecordId, group] of allocationsByStockRecord) {
        const { stock, qty, allocations } = group;
        const before = stock.row;
        const warehouseName = stock.warehouseName;
        const reorderLevel = Number(before["reorderLevel"] ?? 0);
        const currentQty = Number(before["qtyOnHand"] ?? 0);

        // Consume from the actual warehouse bucket selected by the plan,
        // then create the matching Defective return only for the quantity
        // that physically left Good stock.
        const representative = allocations[0].line;
        const newQty = await adjustExistingStockRecordQty(partnerId, stockRecordId, -qty);
        await adjustStockQty(partnerId, representative.materialId, representative.materialLabel, warehouseName, qty, "Defective");

        const serializedAllocations = allocations.filter(({ line }) => line.serialized && line.serial);
        if (serializedAllocations.length > 0) {
          // Re-read after adjustStockQty so adding serial history cannot
          // restore stale availableQty/reservation metadata from `before`.
          const updated = await getBusinessRecord(partnerId, "inventory-stock", stockRecordId);
          if (updated) {
            const consumedSerials = Array.isArray(updated["consumedSerials"]) ? (updated["consumedSerials"] as unknown[]) : [];
            await updateBusinessRecord(partnerId, "inventory-stock", stockRecordId, {
              ...updated,
              consumedSerials: [
                ...consumedSerials,
                ...serializedAllocations.map(({ line }) => ({ serial: line.serial, workorderId, consumedAt: new Date().toISOString() })),
              ],
            });
          }
        }

        for (const allocation of allocations) {
          const { line, qty: allocationQty } = allocation;
          await createBusinessRecord(partnerId, "inventory-consumption", {
            source: "Service Centre",
            workorderId,
            workorderNumber: workorderId,
            materialId: line.materialId,
            materialLabel: line.materialLabel,
            warehouseName,
            qty: allocationQty,
            serial: line.serialized ? line.serial ?? "" : "",
            customerName,
            consumedDate: new Date().toISOString().slice(0, 10),
          });
        }

        if (partner && reorderLevel > 0 && currentQty > reorderLevel && newQty <= reorderLevel) {
          await sendPartnerTelegramAlert(
            partnerId,
            "lowStock",
            await lowStockAlertMessage({
              partnerBusinessName: partner.businessName,
              itemName: representative.materialLabel || representative.materialId,
              quantityRemaining: newQty,
              reorderThreshold: reorderLevel,
            })
          );
        }
      }
    });

    await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  revalidatePath(`/partner/${partnerId}/inventory/consumption`);
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
  // Same double-fire concern as deductInventoryForWorkorderAction — the
  // `if (lifecycle.invoiceId) return` guard below only protects against
  // re-reading a PERSISTED invoiceId, not two in-flight calls racing
  // before either write lands (e.g. a double-click on Close/"Retry Invoice
  // Creation" firing this twice). The lock serializes the whole
  // read-check-mint-number-create-invoice-write-back sequence per workorder.
  await withWorkorderLock(workorderId, () => createInvoiceFromWorkorderInner(partnerId, workorderId, payment));
}

async function createInvoiceFromWorkorderInner(
  partnerId: string,
  workorderId: string,
  payment?: { collected: boolean; mode?: string; amount?: number }
): Promise<void> {
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
  const advances = underWarranty ? [] : workorderAdvancePayments(record);
  const advanceTotal = advances.reduce((sum, item) => sum + item.amount, 0);
  // An advance can settle no more than this invoice's total. Any excess is
  // never silently treated as sales payment: it remains explicitly visible
  // as refund/credit due for the partner to resolve with the customer.
  const advanceApplied = Math.min(totalAmount, advanceTotal);
  const advanceExcess = Math.max(0, advanceTotal - advanceApplied);

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
  // GST and Non-GST invoice serials are separate across the entire system.
  // Customer GSTIN only decides B2B/B2C tax details; it must never decide
  // this serial because a GST-registered business can issue a GST invoice
  // to a B2C customer. The type is determined by the issuing partner's own
  // GST registration, exactly as the persisted invoiceType below is.
  const invoicingPartner = await getPartner(partnerId);
  const partnerHasGstin = Boolean(invoicingPartner?.gstin?.trim());
  const [{ getNextNumber }, { invoiceNumberingConfig }] = await Promise.all([
    import("@/lib/designer/numbering"),
    import("@/lib/invoiceNumbering"),
  ]);
  const numbering = invoiceNumberingConfig(partnerHasGstin ? "GST" : "Non-GST");
  const invoiceNumber = await getNextNumber(numbering.documentType, partnerId, numbering.defaults);

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
  const finalAmountPayable = Math.max(0, totalAmount - advanceApplied);
  const collected = Boolean(payment?.collected) && !underWarranty;
  const collectedAmount = collected
    ? Math.max(0, Math.min(finalAmountPayable, Number(payment?.amount ?? finalAmountPayable) || 0))
    : 0;
  const amountPaid = underWarranty ? totalAmount : advanceApplied + collectedAmount;
  const amountDue = totalAmount - amountPaid;
  // Invoice date = handover date, not invoice-record-creation time — the
  // customer receives/pays at handover (confirmClose stamps handedOverAt
  // just before this runs), while this action can itself run slightly
  // later (or via Retry Invoice Creation, much later) than the actual
  // handover moment.
  const issueDate = (
    (record["handedOverAt"] as string | undefined) ?? new Date().toISOString()
  ).slice(0, 10);

  // Fetched here (rather than only further below, where a second
  // getPartner(partnerId) call already existed for the AN-Accounting push)
  // so the GST-invoice gate below can use it. Same fail-closed rule as
  // Billing's own direct "New Invoice" form (BillingInvoiceForm.tsx /
  // businessRecordActions.ts): a partner with no GSTIN of their own cannot
  // issue a GST-format tax invoice (buyer GSTIN/HSN fields), so an
  // auto-generated Service Centre invoice for such a partner must come out
  // as a plain/Non-GST invoice — the buyer's GSTIN and each line's HSN code
  // are dropped rather than carried over.
  const invoice = await createBusinessRecord(partnerId, "billing", {
    invoiceNumber,
    invoiceType: partnerHasGstin ? "GST" : "Non-GST",
    customer: record["customer"] ?? "",
    // Carried over from the workorder's intake block so the Billing
    // invoice knows who it's billed to (and whether it's B2B) instead of
    // holding a bare customer name — see serviceCentreFormFields.
    customerPhone: record["customerPhone"] ?? "",
    customerAlternatePhone: record["customerAlternatePhone"] ?? "",
    customerEmail: record["customerEmail"] ?? "",
    customerGstin: partnerHasGstin ? record["customerGstin"] ?? "" : "",
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
      hsnCode: partnerHasGstin ? l.hsn || undefined : undefined,
    })),
    subtotal,
    taxAmount,
    discountAmount: 0,
    roundOff: 0,
    totalAmount,
    amountPaid,
    amountDue,
    advanceAmount: advanceTotal,
    advanceApplied,
    advanceExcess,
    finalAmountCollected: collectedAmount,
    paymentStatus: amountDue <= 0 ? "Paid" : amountPaid > 0 ? "Partially Paid" : "Draft",
    paymentMode: collected ? payment?.mode : undefined,
    sourceWorkorderId: workorderId,
    invoiceSource: "Service Centre",
  });

  // Mirror the Billing > Payments record the manual form would have
  // created, so the money shows up in the outstanding/statement reports
  // rather than only as a field on the invoice.
  let remainingAdvanceToApply = totalAmount;
  for (const advance of advances) {
    const appliedAmount = Math.min(advance.amount, remainingAdvanceToApply);
    remainingAdvanceToApply -= appliedAmount;
    if (appliedAmount <= 0) continue;
    await createBusinessRecord(partnerId, "billing-payments", {
      invoiceId: invoice.id,
      contact: record["customer"] ?? "",
      amount: appliedAmount,
      mode: advance.mode,
      date: advance.receivedAt.slice(0, 10),
      reference: `Advance adjusted - workorder ${workorderId}${advance.reference ? ` (${advance.reference})` : ""}`,
    });
  }
  if (collected && collectedAmount > 0) {
    await createBusinessRecord(partnerId, "billing-payments", {
      invoiceId: invoice.id,
      contact: record["customer"] ?? "",
      amount: collectedAmount,
      mode: payment?.mode ?? "Cash",
      date: issueDate,
      reference: `Collected at handover — workorder ${workorderId}`,
    });
  }
  if (advances.length > 0 || (collected && collectedAmount > 0)) revalidatePath(`/partner/${partnerId}/billing/payments`);

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
  const partner = invoicingPartner;
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
    paymentCollected: amountDue <= 0 || underWarranty,
    paymentMode: collected ? payment?.mode : undefined,
    paymentCollectedAmount: amountPaid,
    paymentCollectedAt: collected ? new Date().toISOString() : undefined,
    advanceTotal,
    advanceApplied,
    advanceExcess,
    finalAmountCollected: collectedAmount,
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
 * Reverses every not-yet-reversed "inventory-consumption" entry for this
 * workorder — adds each line's qty back to the real Stock ledger
 * (adjustStockQty with a positive delta) and stamps `reversedAt` on the
 * consumption record so it can't be double-reversed and so Parts
 * Consumption reporting can tell a genuinely-reversed line apart from a
 * still-standing one. Used whenever a workorder moves backward off a
 * stage that already consumed stock (cancelling a Completed job, or a
 * Super Admin reopening one) — parts that were pulled for a job that
 * didn't end up happening/being kept should go back on the shelf, not
 * just vanish from the count. Returns a plain-text summary per line for
 * the caller to fold into the workorder's own stageHistory entry.
 */
async function reverseConsumptionForWorkorder(partnerId: string, workorderId: string): Promise<string[]> {
  const consumptionRows = await listBusinessRecords(partnerId, "inventory-consumption");
  const toReverse = consumptionRows.filter((r) => r["workorderId"] === workorderId && !r["reversedAt"]);
  const summaries: string[] = [];
  for (const row of toReverse) {
    const materialId = String(row["materialId"] ?? "");
    const materialLabel = String(row["materialLabel"] ?? materialId);
    const warehouseName = String(row["warehouseName"] ?? "");
    const qty = Number(row["qty"] ?? 0);
    if (materialId && warehouseName && qty > 0) {
      // Reverse the exact Good -> Defective movement made at consumption.
      // Keeping both sides in one locked helper prevents duplicate Defective
      // rows and guarantees the Good bucket is restored as one operation.
      await moveDefectiveToGood(partnerId, materialId, materialLabel, warehouseName, qty);
      summaries.push(`${materialLabel} x${qty}`);
    }
    await updateBusinessRecord(partnerId, "inventory-consumption", String(row["id"]), {
      ...row,
      reversedAt: new Date().toISOString(),
      reversedReason: "Workorder status changed",
    });
  }
  return summaries;
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
  reason: string,
  settlement?: { refundAmount: number; mode?: string; reference?: string }
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const trimmedReason = (reason ?? "").trim();
  if (!trimmedReason) {
    throw new WorkorderValidationError("A cancellation reason is required.");
  }
  await withWorkorderLock(workorderId, async () => {
    const record = await requireWorkorder(partnerId, workorderId);
    if (record["cancelledAt"]) {
      throw new WorkorderValidationError("This workorder has already been cancelled.");
    }
    if (record["stage"] === "Closed") {
      throw new WorkorderValidationError("A closed workorder can no longer be cancelled.");
    }

    const advances = workorderAdvancePayments(record);
    const advanceTotal = advances.reduce((sum, item) => sum + item.amount, 0);
    const refundAmount = Math.round(Number(settlement?.refundAmount ?? 0) * 100) / 100;
    if (advanceTotal > 0 && (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > advanceTotal)) {
      throw new WorkorderValidationError(`Refund amount must be between ₹0 and ₹${advanceTotal.toFixed(2)}.`);
    }
    if (refundAmount > 0 && !settlement?.mode?.trim()) {
      throw new WorkorderValidationError("Select the payment mode used for the advance refund.");
    }
    const retainedAmount = Math.max(0, advanceTotal - refundAmount);

    // A job cancelled AFTER it was already Completed already had its parts
    // deducted from real Stock — cancelling it doesn't undo that on its
    // own, so the consumed parts return to Stock here, and the return
    // itself is logged onto the workorder's own activity timeline (not
    // just a silent stock-ledger change) so anyone looking at this job
    // later can see exactly what came back and when.
    let history = appendStageHistory(record, "Cancelled");
    // Reconcile actual consumption rows even if the legacy flag is missing
    // or stale. The rows are the source of truth and are idempotently marked
    // reversed, so repeated cancellation attempts cannot add stock twice.
    const returned = await reverseConsumptionForWorkorder(partnerId, workorderId);
    if (returned.length > 0) {
      history = [
        ...history,
        { at: new Date().toISOString(), stage: `Parts returned to Inventory on cancel: ${returned.join(", ")}` },
      ];
    }
    if (advanceTotal > 0) {
      history = [...history, {
        at: new Date().toISOString(),
        stage: `Advance settlement on cancellation: refunded ₹${refundAmount.toFixed(2)}${refundAmount > 0 ? ` via ${settlement?.mode}` : ""}; retained ₹${retainedAmount.toFixed(2)}`,
      }];
      await createBusinessRecord(partnerId, "service-centre-advance-settlements", {
        workorderId,
        customer: record["customer"] ?? "",
        advanceTotal,
        refundAmount,
        retainedAmount,
        refundMode: refundAmount > 0 ? settlement?.mode?.trim() : undefined,
        refundReference: settlement?.reference?.trim() || undefined,
        reason: trimmedReason,
        settledAt: new Date().toISOString(),
        status: refundAmount === advanceTotal ? "Fully Refunded" : refundAmount === 0 ? "Retained" : "Partially Refunded",
      });
    }

    await updateBusinessRecord(partnerId, "service-centre", workorderId, {
      ...record,
      cancelReason: trimmedReason,
      cancelledAt: new Date().toISOString(),
      onHold: false,
      holdReason: undefined,
      holdSince: undefined,
      inventoryDeducted: false,
      stageHistory: history,
      advanceSettlementAt: advanceTotal > 0 ? new Date().toISOString() : undefined,
      advanceRefundAmount: advanceTotal > 0 ? refundAmount : undefined,
      advanceRetainedAmount: advanceTotal > 0 ? retainedAmount : undefined,
      advanceRefundMode: refundAmount > 0 ? settlement?.mode?.trim() : undefined,
      advanceRefundReference: settlement?.reference?.trim() || undefined,
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
  });

  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
  revalidatePath(`/partner/${partnerId}/service-centre/payments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  revalidatePath(`/partner/${partnerId}/inventory/consumption`);
}

/**
 * Reopens a Completed workorder back to In Progress — the one exception to
 * assertLegalStageTransition's forward-only rule. Because this reverses a
 * milestone the business has already treated as done (a completed repair
 * potentially already invoiced/handed to the customer), it requires a
 * Telegram OTP sent to the partner's connected personal (Owner) chat to
 * have been verified first (see workorderReopenAccess.ts /
 * requestWorkorderReopenOtpAction + verifyWorkorderReopenOtpAction) — the
 * unlock is consumed here so one verified code reopens exactly one
 * workorder once. Inventory is left untouched: Completed already deducted
 * the consumed parts and the job is still going ahead, just backing up a
 * step, so nothing needs to be returned to stock (contrast
 * cancelWorkorderAction, which is a real abandonment).
 */
export async function reopenWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  const unlocked = await isWorkorderReopenUnlocked(workorderId);
  if (!unlocked) {
    throw new WorkorderValidationError("Enter the Telegram OTP sent to the Owner's chat before reopening this workorder.");
  }
  await withWorkorderLock(workorderId, async () => {
    const record = await requireWorkorder(partnerId, workorderId);
    if (record["cancelledAt"] || record["stage"] === "Closed") {
      throw new WorkorderValidationError("This workorder can no longer be reopened.");
    }
    if (record["stage"] !== "Completed") {
      throw new WorkorderValidationError("Only a Completed workorder can be reopened to In Progress.");
    }
    let history = appendStageHistory(record, "In Progress (reopened, Owner OTP verified)");
    const returned = await reverseConsumptionForWorkorder(partnerId, workorderId);
    if (returned.length > 0) {
      history = [
        ...history,
        { at: new Date().toISOString(), stage: `Parts returned to Inventory on reopen: ${returned.join(", ")}` },
      ];
    }
    await updateBusinessRecord(partnerId, "service-centre", workorderId, {
      ...record,
      stage: "In Progress",
      inventoryDeducted: false,
      stageHistory: history,
    });
  });
  await consumeWorkorderReopenUnlock(workorderId);
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  revalidatePath(`/partner/${partnerId}/inventory/consumption`);
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
  await withWorkorderLock(workorderId, async () => {
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
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
}

/**
 * Creates a "Part Not Available" tracking entry when a part line on this
 * workorder can't be fulfilled from current Stock — a real BusinessRecord
 * (moduleSlug "service-centre-pna"), not just a UI-only "pending" flag, so
 * owner/staff have an actual list to work from to go source the part
 * (Purchase/Part Order from Inventory), separate from the workorder itself.
 * Carries the customer + part + optional supplier Brand Job No. reference
 * so it's actionable without having to reopen the original workorder.
 */
export async function createPnaEntryAction(
  partnerId: string,
  payload: {
    workorderId: string;
    materialId: string;
    materialLabel: string;
    qty: number;
    customerName?: string;
    customerPhone?: string;
    brandJobNo?: string;
  }
): Promise<void> {
  await assertCanActOnServiceCentre(partnerId);
  // materialLabel arrives as "CODE — Description" (the BOM option's own
  // label shape) when picked from the typeahead, or plain free text when
  // typed with no catalog match — split it into a real Material Code and
  // Part Name kept as SEPARATE fields, not the combined string, so staff
  // ordering the part from a supplier can read/search/export the part name
  // on its own instead of parsing "MAT-1001 — Description" by hand.
  const [rawCode, ...rest] = payload.materialLabel.split(" — ");
  const materialCode = (rawCode || payload.materialId).trim();
  const materialName = rest.join(" — ").trim();
  await createBusinessRecord(partnerId, "service-centre-pna", {
    workorderId: payload.workorderId,
    materialId: payload.materialId,
    materialLabel: payload.materialLabel,
    materialCode,
    materialName,
    qty: payload.qty,
    customerName: payload.customerName ?? "",
    customerPhone: payload.customerPhone ?? "",
    brandJobNo: payload.brandJobNo ?? "",
    status: "Open",
    createdDate: new Date().toISOString().slice(0, 10),
  });
  revalidatePath(`/partner/${partnerId}/service-centre/pna`);

  const partner = await getPartner(partnerId);
  if (partner) {
    await sendWorkorderTelegramAlert(
      partnerId,
      payload.workorderId,
      "pnaLogged",
      await pnaLoggedMessage({
        partnerBusinessName: partner.businessName,
        workorderId: payload.workorderId,
        materialLabel: payload.materialLabel,
        qty: payload.qty,
        customerName: payload.customerName,
        brandJobNo: payload.brandJobNo,
      })
    );
  }
}
