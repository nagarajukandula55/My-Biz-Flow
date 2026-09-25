/**
 * Shared helpers for the 5 NEW-vertical demo-partner seed scripts
 * (scripts/seed-demo-manufacturing.ts, seed-demo-wholesale-b2b.ts,
 * seed-demo-event-booking.ts, seed-demo-legal.ts, seed-demo-education.ts).
 *
 * Deliberately separate from src/lib/demoPartnerSeed.ts (the existing
 * Service Centre DEMO0001 account) — that file is untouched by this work.
 * Same underlying pattern (idempotent findUnique-first partner creation,
 * fixed login/no-OTP, 100-year Trial subscription that unlocks every
 * Pro/Ultimate feature per src/lib/tenant.ts's getPageTierAccess), just
 * generalized so each of the 5 new-vertical scripts can reuse it instead
 * of re-deriving the same Partner-creation boilerplate five times.
 *
 * Each new demo partner uses its own synthetic "DEMO-<PREFIX>0001" id
 * (PREFIX = that PartnerType's real idPrefix from
 * scripts/seed-new-vertical-partner-types.ts: MFG/WSB/EVB/LGL/EDU) — never
 * a real "<prefix>####" id — so nextPartnerId()'s count of existing
 * partners per prefix (src/lib/partnerData.ts) is never inflated and no
 * real signup's sequence number ever shifts. This mirrors exactly why
 * demoPartnerSeed.ts uses "DEMO0001" instead of "SC0001".
 */
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { issueAccessKey } from "@/lib/designer/accessKeys";
import type { Partner, PartnerType } from "@prisma/client";

export const DEMO_PASSWORD = "DemoPartner@123";

export type DemoVerticalPartnerConfig = {
  id: string; // e.g. "DEMO-MFG0001"
  partnerTypeId: string; // real PartnerType id/slug, e.g. "manufacturing"
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  loginContact: string; // 10-digit, unique across Partner.loginContact
  businessEmail: string;
};

/**
 * Creates (or confirms) a demo Partner row for one of the 5 new verticals,
 * plus module access keys for every module in that PartnerType's
 * defaultModules (mirrors createPartner()'s issueDefaultModuleAccessKeys,
 * called directly here — same pattern demoPartnerSeed.ts's
 * ensureDemoPartner() uses). Safe to re-run: no-ops if the id already
 * exists.
 */
export async function ensureDemoVerticalPartner(
  config: DemoVerticalPartnerConfig
): Promise<{ partner: Partner; partnerType: PartnerType; alreadyExisted: boolean }> {
  const existing = await prisma.partner.findUnique({ where: { id: config.id } });

  const partnerType = await prisma.partnerType.findUnique({ where: { id: config.partnerTypeId } });
  if (!partnerType) {
    throw new Error(
      `PartnerType "${config.partnerTypeId}" not found — run scripts/seed-new-vertical-partner-types.ts first.`
    );
  }

  if (existing) {
    return { partner: existing, partnerType, alreadyExisted: true };
  }

  const now = new Date();
  const trialEndAt = new Date(now);
  trialEndAt.setFullYear(trialEndAt.getFullYear() + 100); // effectively never expires

  const partner = await prisma.partner.create({
    data: {
      id: config.id,
      internalKey: `BIZ002-${config.id}`,
      businessId: "BIZ002",
      partnerTypeId: config.partnerTypeId,
      businessName: config.businessName,
      addressLine: config.addressLine,
      city: config.city,
      state: config.state,
      pincode: config.pincode,
      gstin: null,
      businessEmail: config.businessEmail,
      businessContact: config.loginContact,
      loginContact: config.loginContact,
      passwordHash: hashPassword(DEMO_PASSWORD),
      mustChangePassword: false,
      subscriptionStatus: "Trial",
      trialStartAt: now,
      trialEndAt,
    },
  });

  for (const slug of partnerType.defaultModules as string[]) {
    await issueAccessKey(partner.id, slug, `Demo partner — issued by ${config.id} seed script`);
  }

  return { partner, partnerType, alreadyExisted: false };
}

/** Small seeded PRNG (mulberry32) — deterministic so re-running a script is safe/stable, but still gives varied-looking, non-uniform data instead of a suspiciously regular pattern. Same implementation as demoPartnerSeed.ts's private copy. */
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function daysAgoDate(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
