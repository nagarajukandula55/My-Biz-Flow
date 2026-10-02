/**
 * Referral tracking — who referred whom, and their real current status.
 * Partner referral codes aren't stored: they're derived deterministically
 * from the referring partner's own id (see referralCodeForPartner/
 * partnerIdFromReferralCode below). A telecalling agent's referral code is
 * simply their existing loginId (e.g. "AGT001") — no new code to generate
 * there either. Partner.referredByPartnerId / Partner.referredByStaffId
 * (prisma/schema.prisma) record WHO referred WHOM only; the actual 10%
 * commission-on-first-payment credit lives in src/lib/acceptSubscriptionPayment.ts
 * + src/lib/walletClient.ts, which call out to the central ANy Pay ledger
 * in the accounting app.
 */
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";

const REFERRAL_PREFIX = "REF-";

export function referralCodeForPartner(partnerId: string): string {
  return `${REFERRAL_PREFIX}${partnerId}`;
}

export function referralLinkForPartner(partnerId: string): string {
  return `${SITE_URL}/signup?ref=${encodeURIComponent(referralCodeForPartner(partnerId))}`;
}

/** Resolves a referral code back to the referring Partner's id, or undefined if the code doesn't name a real partner. */
export async function partnerIdFromReferralCode(code: string): Promise<string | undefined> {
  if (!code.startsWith(REFERRAL_PREFIX)) return undefined;
  const partnerId = code.slice(REFERRAL_PREFIX.length).trim();
  if (!partnerId) return undefined;
  const partner = await prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true } });
  return partner?.id;
}

export type ReferrerRef = { type: "PARTNER"; id: string } | { type: "STAFF"; id: string };

/**
 * Resolves ANY referral code entered at signup — either a partner's
 * `REF-<partnerId>` code, or a telecalling agent's bare loginId (their
 * existing Telecalling-module login credential, e.g. "AGT001"). Returns
 * undefined if the code doesn't name anyone real.
 *
 * NOTE: PartnerStaff.loginId is only unique per-partner
 * (@@unique([partnerId, loginId])), not globally, so this does a
 * findFirst — if two different telecalling partner tenants ever mint the
 * same loginId, the first match wins. Fine while there's a small number
 * of telecalling tenants; revisit (e.g. a globally-unique agent code) if
 * that stops being true.
 */
export async function resolveReferrer(code: string): Promise<ReferrerRef | undefined> {
  const trimmed = code.trim();
  if (!trimmed) return undefined;

  const partnerId = await partnerIdFromReferralCode(trimmed);
  if (partnerId) return { type: "PARTNER", id: partnerId };

  const staff = await prisma.partnerStaff.findFirst({
    where: { loginId: trimmed, role: "Telecaller", status: "Active" },
    select: { id: true },
  });
  if (staff) return { type: "STAFF", id: staff.id };

  return undefined;
}

export type ReferredPartner = {
  id: string;
  businessName: string;
  status: string;
  subscriptionStatus: string;
  createdAt: Date;
};

/** Every partner this partner has referred, most recent first — real Partner rows, not a fabricated list. */
export async function listReferredPartners(partnerId: string): Promise<ReferredPartner[]> {
  const rows = await prisma.partner.findMany({
    where: { referredByPartnerId: partnerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, businessName: true, status: true, subscriptionStatus: true, createdAt: true },
  });
  return rows;
}
