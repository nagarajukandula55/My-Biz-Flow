"use server";

import { revalidatePath } from "next/cache";
import { getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { extractRealEstateLifecycle, type LeadStage } from "@/lib/sample-data/real-estate";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Server-side conflict check: an agent can't have two overlapping site
 * visits. Scans every other real-estate BusinessRecord for this partner
 * that shares the same agent and has a scheduled site-visit window,
 * excluding the record being edited.
 */
export async function checkSiteVisitConflictAction(
  partnerId: string,
  listingId: string,
  agentId: string,
  siteVisitStart: string,
  siteVisitEnd: string
): Promise<{ conflict: boolean; conflictingListingId?: string }> {
  if (!agentId || !siteVisitStart || !siteVisitEnd) return { conflict: false };
  const rows = await listBusinessRecords(partnerId, "real-estate");
  for (const row of rows) {
    const id = String(row["id"]);
    if (id === listingId) continue;
    const lc = extractRealEstateLifecycle(row);
    const rowAgentId = lc.agentId ?? lc.agentName;
    if (rowAgentId !== agentId) continue;
    if (!lc.siteVisitStart || !lc.siteVisitEnd) continue;
    if (overlaps(siteVisitStart, siteVisitEnd, lc.siteVisitStart, lc.siteVisitEnd)) {
      return { conflict: true, conflictingListingId: id };
    }
  }
  return { conflict: false };
}

/**
 * Schedules (or reschedules) a site visit for a listing after a
 * server-side conflict check against the same agent's other visits.
 * Returns { ok:false, message } instead of persisting when a conflict is
 * found — the caller decides how to surface it.
 */
export async function scheduleSiteVisitAction(
  partnerId: string,
  listingId: string,
  agentId: string,
  agentName: string,
  siteVisitStart: string,
  siteVisitEnd: string
): Promise<{ ok: boolean; message?: string }> {
  const check = await checkSiteVisitConflictAction(partnerId, listingId, agentId, siteVisitStart, siteVisitEnd);
  if (check.conflict) {
    return {
      ok: false,
      message: `${agentName || agentId} already has an overlapping site visit scheduled on listing ${check.conflictingListingId}. Choose a different time.`,
    };
  }
  const record = await getBusinessRecord(partnerId, "real-estate", listingId);
  if (!record) return { ok: false, message: "Listing not found." };
  await updateBusinessRecord(partnerId, "real-estate", listingId, {
    ...record,
    agentId,
    agentName,
    siteVisitStart,
    siteVisitEnd,
    stage: record["stage"] === "New" ? ("Site Visit Scheduled" as LeadStage) : record["stage"],
  });
  revalidatePath(`/partner/${partnerId}/real-estate/${listingId}`);
  return { ok: true };
}

/**
 * Advances (or moves) the lead pipeline stage for a listing. When moving
 * INTO "Agreement Signed", requires dealValue + commissionPct and computes
 * commissionAmount server-side — never trusts a client-submitted amount.
 */
export async function updateLeadStageAction(
  partnerId: string,
  listingId: string,
  nextStage: LeadStage,
  opts?: { dealValue?: number; commissionPct?: number; closedLostReason?: string }
): Promise<{ ok: boolean; message?: string }> {
  const record = await getBusinessRecord(partnerId, "real-estate", listingId);
  if (!record) return { ok: false, message: "Listing not found." };

  const patch: Record<string, unknown> = { stage: nextStage };

  if (nextStage === "Agreement Signed") {
    const dealValue = Number(opts?.dealValue ?? record["dealValue"] ?? record["price"] ?? 0);
    const commissionPct = Number(opts?.commissionPct ?? 0);
    if (!dealValue || dealValue <= 0) {
      return { ok: false, message: "A deal value is required before marking the agreement signed." };
    }
    if (!commissionPct || commissionPct <= 0) {
      return { ok: false, message: "Commission % is required before marking the agreement signed." };
    }
    const commissionAmount = Math.round((dealValue * commissionPct) / 100);
    patch.dealValue = dealValue;
    patch.commissionPct = commissionPct;
    patch.commissionAmount = commissionAmount;
  }

  if (nextStage === "Closed/Lost" && opts?.closedLostReason) {
    patch.closedLostReason = opts.closedLostReason;
  }

  await updateBusinessRecord(partnerId, "real-estate", listingId, { ...record, ...patch });
  revalidatePath(`/partner/${partnerId}/real-estate/${listingId}`);
  return { ok: true };
}
