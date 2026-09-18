"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Public "Track My Repair" lookup — the one place in this app where an
 * unauthenticated caller's query is deliberately allowed to span every
 * partner's data (see src/lib/tenant.ts for the general partnerId-scoping
 * rule this is a documented exception to).
 *
 * WHY this is safe: a workorder number alone (Service Centre's per-partner
 * counter) is not globally unique and doesn't identify which partner a
 * customer's job belongs to, so a partner-scoped lookup isn't possible here
 * — the visitor genuinely doesn't know the partnerId. The exception is
 * gated by requiring an EXACT match on BOTH the workorder number AND the
 * phone number used at intake, together, every time:
 *   - number alone would let anyone enumerate/guess other customers' jobs
 *   - phone alone would leak a customer's whole repair history to anyone
 *     who merely knows their number
 * Neither half is ever accepted on its own, and a non-match never reveals
 * which half was wrong (mirrors this app's /forgot-password: same response
 * whether the identifier existed or not).
 *
 * Implementation note: this scans every service-centre BusinessRecord row
 * and matches customerPhone out of the JSON `data` column in-memory/via a
 * Prisma JSON path filter, rather than a partner-scoped indexed query —
 * deliberately not over-engineered per the task's own scope (low-frequency
 * public action, table not huge). If this table grows large, a dedicated
 * index on (moduleSlug, recordKey) plus a computed/indexed customerPhone
 * column would speed this up; not built here.
 */
export async function lookupWorkorder(formData: FormData) {
  const workorderNumber = String(formData.get("workorderNumber") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!workorderNumber || !phone) {
    redirect("/track?error=missing");
  }

  // Checked second: the reference number could be either a workorder
  // (WO-...) or an inquiry/appointment (INQ-...) not yet converted — same
  // exact-match-on-both-fields safety rule as the workorder lookup above.
  const workorderMatch = await prisma.businessRecord.findFirst({
    where: {
      moduleSlug: "service-centre",
      recordKey: workorderNumber,
      data: { path: ["customerPhone"], equals: phone } as any,
    },
    select: { partnerId: true, recordKey: true },
  });

  if (workorderMatch) {
    redirect(`/service-centre-track/${encodeURIComponent(workorderMatch.partnerId)}/${encodeURIComponent(workorderMatch.recordKey)}`);
  }

  const inquiryMatch = await prisma.businessRecord.findFirst({
    where: {
      moduleSlug: "service-centre-inquiry",
      recordKey: workorderNumber,
      data: { path: ["customerPhone"], equals: phone } as any,
    },
    select: { partnerId: true, recordKey: true },
  });

  if (!inquiryMatch) {
    redirect("/track?error=not_found");
  }

  redirect(`/service-centre-track-inquiry/${encodeURIComponent(inquiryMatch.partnerId)}/${encodeURIComponent(inquiryMatch.recordKey)}`);
}
