"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createEnquiry,
  getEnquiry,
  listEnquiries,
  patchEnquiryLifecycle,
  updateEnquiry,
  rupeesToPaise,
  type LeadStage,
} from "@/lib/realEstateData";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export async function createEnquiryAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const enquiry = await createEnquiry(partnerId, {
    propertyId: (values["propertyId"] as string) || null,
    agentName: (values["agentName"] as string) || null,
    stage: (values["stage"] as LeadStage) || "New",
  });
  revalidatePath(`/partner/${partnerId}/real-estate`);
  redirect(`/partner/${partnerId}/real-estate/${enquiry.id}`);
}

export async function updateEnquiryAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getEnquiry(partnerId, recordId);
  if (!existing) return { error: "Enquiry not found." };

  await updateEnquiry(partnerId, recordId, {
    propertyId: (values["propertyId"] as string) || null,
    agentName: (values["agentName"] as string) || null,
    stage: (values["stage"] as LeadStage) || existing.stage,
  });
  revalidatePath(`/partner/${partnerId}/real-estate`);
  revalidatePath(`/partner/${partnerId}/real-estate/${recordId}`);
  redirect(`/partner/${partnerId}/real-estate/${recordId}?updated=1`);
}

/**
 * Server-side conflict check: an agent can't have two overlapping site
 * visits. Scans every other Enquiry for this partner that shares the same
 * agent (by name — Enquiry has no agentId column) and has a scheduled
 * site-visit window, excluding the record being edited.
 */
export async function checkSiteVisitConflictAction(
  partnerId: string,
  listingId: string,
  agentId: string,
  siteVisitStart: string,
  siteVisitEnd: string
): Promise<{ conflict: boolean; conflictingListingId?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!agentId || !siteVisitStart || !siteVisitEnd) return { conflict: false };
  const rows = await listEnquiries(partnerId);
  for (const row of rows) {
    if (row.id === listingId) continue;
    if ((row.agentName ?? "") !== agentId) continue;
    if (!row.siteVisitStart || !row.siteVisitEnd) continue;
    if (overlaps(siteVisitStart, siteVisitEnd, row.siteVisitStart.toISOString(), row.siteVisitEnd.toISOString())) {
      return { conflict: true, conflictingListingId: row.id };
    }
  }
  return { conflict: false };
}

/**
 * Schedules (or reschedules) a site visit for an enquiry after a
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
  partnerId = await requireSessionPartnerId(partnerId);
  const check = await checkSiteVisitConflictAction(partnerId, listingId, agentId, siteVisitStart, siteVisitEnd);
  if (check.conflict) {
    return {
      ok: false,
      message: `${agentName || agentId} already has an overlapping site visit scheduled on enquiry ${check.conflictingListingId}. Choose a different time.`,
    };
  }
  const existing = await getEnquiry(partnerId, listingId);
  if (!existing) return { ok: false, message: "Enquiry not found." };
  await patchEnquiryLifecycle(partnerId, listingId, {
    agentName,
    siteVisitStart: new Date(siteVisitStart),
    siteVisitEnd: new Date(siteVisitEnd),
    stage: existing.stage === "New" ? ("Site Visit Scheduled" as LeadStage) : undefined,
  });
  revalidatePath(`/partner/${partnerId}/real-estate/${listingId}`);
  return { ok: true };
}

/**
 * Advances (or moves) the lead pipeline stage for an enquiry. When moving
 * INTO "Agreement Signed", requires dealValue + commissionPct and computes
 * commissionAmount server-side — never trusts a client-submitted amount.
 */
export async function updateLeadStageAction(
  partnerId: string,
  listingId: string,
  nextStage: LeadStage,
  opts?: { dealValue?: number; commissionPct?: number; closedLostReason?: string }
): Promise<{ ok: boolean; message?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getEnquiry(partnerId, listingId);
  if (!existing) return { ok: false, message: "Enquiry not found." };

  const patch: Parameters<typeof patchEnquiryLifecycle>[2] = { stage: nextStage };

  if (nextStage === "Agreement Signed") {
    const dealValueRupees = Number(opts?.dealValue ?? 0);
    const commissionPct = Number(opts?.commissionPct ?? 0);
    if (!dealValueRupees || dealValueRupees <= 0) {
      return { ok: false, message: "A deal value is required before marking the agreement signed." };
    }
    if (!commissionPct || commissionPct <= 0) {
      return { ok: false, message: "Commission % is required before marking the agreement signed." };
    }
    const dealValue = rupeesToPaise(dealValueRupees);
    const commissionAmount = Math.round((dealValue * commissionPct) / 100);
    patch.dealValue = dealValue;
    patch.commissionPct = commissionPct;
    patch.commissionAmount = commissionAmount;
  }

  if (nextStage === "Closed/Lost" && opts?.closedLostReason) {
    patch.closedLostReason = opts.closedLostReason;
  }

  await patchEnquiryLifecycle(partnerId, listingId, patch);
  revalidatePath(`/partner/${partnerId}/real-estate/${listingId}`);
  return { ok: true };
}
