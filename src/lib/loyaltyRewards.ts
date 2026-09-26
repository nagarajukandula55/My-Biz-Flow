/**
 * Prisma-backed data access for the Loyalty & Rewards module — replaces the
 * generic BusinessRecord store now that dedicated `LoyaltyMember` /
 * `PointsLedgerEntry` tables exist (see prisma/schema.prisma, migration
 * 20260925180000_add_remaining_modules_tables). A member's points balance
 * is now a real, running column (`LoyaltyMember.pointsBalance`) rather than
 * a value recomputed from a JSON `transactions` array — `earnPoints` and
 * `redeemPoints` below are the ONLY two ways that balance changes, each
 * appending one `PointsLedgerEntry` row and updating the balance in the
 * same transaction, so the ledger and the running total can never drift
 * apart.
 *
 * Money fields on both tables are Int paise (same convention as every
 * other money column in this schema — see Booking.priceAmount) — this
 * module's UI/forms work in whole rupees, so every paise value is
 * converted at the boundary here, not left for callers to remember.
 */
import { prisma } from "@/lib/prisma";
import type { Row } from "@/components/DataTable";
import { assertPartnerCanWrite, PartnerScopeError } from "@/lib/tenant";
import type { LoyaltyMember, PointsLedgerEntry } from "@prisma/client";

export const EARN_RATE = 0.05; // 5% of a linked purchase amount, earned as points

export type LoyaltyTierName = "Bronze" | "Silver" | "Gold" | "Platinum";

/** Real tier thresholds, derived from lifetime points earned — never manually set (see the model's doc comment). */
export function computeTier(lifetimePointsEarned: number): LoyaltyTierName {
  if (lifetimePointsEarned >= 5000) return "Platinum";
  if (lifetimePointsEarned >= 3000) return "Gold";
  if (lifetimePointsEarned >= 1000) return "Silver";
  return "Bronze";
}

export interface LoyaltyTransaction {
  id: string;
  type: "Earn" | "Redeem";
  points: number;
  amount?: number; // rupees — linked purchase amount, for Earn entries
  timestamp: string;
}

function toRow(member: LoyaltyMember): Row {
  return {
    id: member.id,
    customerName: member.customerName,
    pointsBalance: member.pointsBalance,
    lifetimePointsEarned: member.lifetimePointsEarned,
    tier: member.tier,
    lastRedemption: member.lastRedemption ? member.lastRedemption.toISOString().slice(0, 10) : undefined,
    cashbackEarned: member.cashbackEarned / 100,
    enrolledModule: member.enrolledModule ?? undefined,
    status: member.status,
    recordCreatedAt: member.createdAt.toISOString(),
  };
}

function toTransaction(entry: PointsLedgerEntry): LoyaltyTransaction {
  return {
    id: entry.id,
    type: entry.type as "Earn" | "Redeem",
    points: entry.points,
    amount: entry.amount != null ? entry.amount / 100 : undefined,
    timestamp: entry.createdAt.toISOString(),
  };
}

export async function listLoyaltyMembers(partnerId: string): Promise<Row[]> {
  const members = await prisma.loyaltyMember.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
  });
  return members.map(toRow);
}

export async function getLoyaltyMember(partnerId: string, id: string): Promise<Row | undefined> {
  const member = await prisma.loyaltyMember.findUnique({ where: { id } });
  if (!member || member.partnerId !== partnerId) return undefined;
  return toRow(member);
}

/** Ledger history for a member, oldest first (UI reverses for display) — throws if the member doesn't belong to this partner. */
export async function listPointsLedger(partnerId: string, memberId: string): Promise<LoyaltyTransaction[]> {
  const member = await prisma.loyaltyMember.findUnique({ where: { id: memberId } });
  if (!member || member.partnerId !== partnerId) {
    throw new PartnerScopeError(`Loyalty member "${memberId}" does not belong to partner "${partnerId}".`);
  }
  const entries = await prisma.pointsLedgerEntry.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
  });
  return entries.map(toTransaction);
}

export type LoyaltyMemberInput = {
  customerName: string;
  lastRedemption?: string | null;
  cashbackEarned?: number; // rupees
  enrolledModule?: string | null;
  status?: string;
};

export async function createLoyaltyMember(partnerId: string, values: LoyaltyMemberInput): Promise<Row> {
  await assertPartnerCanWrite(partnerId);
  const member = await prisma.loyaltyMember.create({
    data: {
      partnerId,
      customerName: String(values.customerName ?? "").trim(),
      lastRedemption: values.lastRedemption ? new Date(values.lastRedemption) : null,
      cashbackEarned: Math.round(Number(values.cashbackEarned ?? 0) * 100),
      enrolledModule: values.enrolledModule || null,
      status: values.status || "Active",
    },
  });
  return toRow(member);
}

export async function updateLoyaltyMember(partnerId: string, id: string, values: LoyaltyMemberInput): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const existing = await prisma.loyaltyMember.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) {
    throw new PartnerScopeError(`Loyalty member "${id}" does not belong to partner "${partnerId}".`);
  }
  await prisma.loyaltyMember.update({
    where: { id },
    data: {
      customerName: String(values.customerName ?? existing.customerName).trim(),
      lastRedemption: values.lastRedemption ? new Date(values.lastRedemption) : null,
      cashbackEarned: Math.round(Number(values.cashbackEarned ?? existing.cashbackEarned / 100) * 100),
      enrolledModule: values.enrolledModule || null,
      status: values.status || existing.status,
    },
  });
}

/** Earns points from a linked purchase amount (points = amount * EARN_RATE, rounded), in one transaction with the running-balance update. */
export async function earnPoints(
  partnerId: string,
  memberId: string,
  amountRupees: number
): Promise<{ error?: string }> {
  await assertPartnerCanWrite(partnerId);
  if (!(amountRupees > 0)) return { error: "Enter a purchase amount greater than zero." };

  const member = await prisma.loyaltyMember.findUnique({ where: { id: memberId } });
  if (!member || member.partnerId !== partnerId) return { error: "Loyalty record not found." };

  const points = Math.round(amountRupees * EARN_RATE);
  const lifetimePointsEarned = member.lifetimePointsEarned + points;
  const tier = computeTier(lifetimePointsEarned);

  await prisma.$transaction([
    prisma.pointsLedgerEntry.create({
      data: {
        memberId,
        type: "Earn",
        points,
        amount: Math.round(amountRupees * 100),
      },
    }),
    prisma.loyaltyMember.update({
      where: { id: memberId },
      data: {
        pointsBalance: member.pointsBalance + points,
        lifetimePointsEarned,
        tier,
      },
    }),
  ]);

  return {};
}

/** Redeems points — fails closed if the balance is insufficient (same pattern as POS's stock check). */
export async function redeemPoints(
  partnerId: string,
  memberId: string,
  points: number
): Promise<{ error?: string }> {
  await assertPartnerCanWrite(partnerId);
  if (!(points > 0)) return { error: "Enter a points amount greater than zero." };

  const member = await prisma.loyaltyMember.findUnique({ where: { id: memberId } });
  if (!member || member.partnerId !== partnerId) return { error: "Loyalty record not found." };

  if (member.pointsBalance < points) {
    return { error: `Insufficient points balance (${member.pointsBalance} available, ${points} requested).` };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.pointsLedgerEntry.create({
      data: {
        memberId,
        type: "Redeem",
        points,
      },
    }),
    prisma.loyaltyMember.update({
      where: { id: memberId },
      data: {
        pointsBalance: member.pointsBalance - points,
        lastRedemption: now,
      },
    }),
  ]);

  return {};
}
