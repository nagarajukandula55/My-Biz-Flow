/**
 * The platform's own commission config — a single global row
 * (Super-Admin-only, same "platform-level, not partner-scoped" posture as
 * Plan/Offer), read by src/lib/fieldForce/commission.ts.
 */
import { prisma } from "@/lib/prisma";

export type PlatformFeeConfigRecord = {
  feeType: "percent" | "flat";
  feeValue: number;
  chargeParty: "customer" | "provider" | "both";
  providerSharePercent: number;
  isActive: boolean;
};

const DEFAULTS: PlatformFeeConfigRecord = {
  feeType: "percent",
  feeValue: 0,
  chargeParty: "customer",
  providerSharePercent: 50,
  isActive: false,
};

export async function getPlatformFeeConfig(): Promise<PlatformFeeConfigRecord> {
  const row = await prisma.platformFeeConfig.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULTS;
  return {
    feeType: row.feeType as "percent" | "flat",
    feeValue: row.feeValue,
    chargeParty: row.chargeParty as "customer" | "provider" | "both",
    providerSharePercent: row.providerSharePercent,
    isActive: row.isActive,
  };
}

export async function setPlatformFeeConfig(input: PlatformFeeConfigRecord): Promise<void> {
  await prisma.platformFeeConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
}
