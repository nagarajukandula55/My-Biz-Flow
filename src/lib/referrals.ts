/**
 * Referral tracking — who referred whom, and their real current status.
 * Referral codes aren't stored: they're derived deterministically from the
 * referring partner's own id (see referralCodeForPartner/partnerIdFromReferralCode
 * below), so there's nothing to generate or keep unique. No rewards/credit
 * ledger exists here — Partner.referredByPartnerId (prisma/schema.prisma)
 * records WHO referred WHOM only; issuing an actual reward is real money
 * movement and deliberately out of scope for this pass.
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
