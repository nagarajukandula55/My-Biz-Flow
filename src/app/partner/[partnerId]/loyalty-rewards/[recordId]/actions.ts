"use server";

import { revalidatePath } from "next/cache";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { extractLoyaltyLifecycleFromRecord, computeTier, EARN_RATE, type LoyaltyTransaction } from "@/lib/sample-data/loyalty-rewards";

/** Earns points from a linked purchase amount (points = amount * EARN_RATE, rounded). */
export async function earnPointsAction(partnerId: string, loyaltyId: string, amount: number): Promise<{ error?: string }> {
  if (!(amount > 0)) return { error: "Enter a purchase amount greater than zero." };
  const record = await getBusinessRecord(partnerId, "loyalty-rewards", loyaltyId);
  if (!record) return { error: "Loyalty record not found." };
  const lifecycle = extractLoyaltyLifecycleFromRecord(record);

  const points = Math.round(amount * EARN_RATE);
  const transaction: LoyaltyTransaction = { id: `LT-${Date.now()}`, type: "Earn", points, amount, timestamp: new Date().toISOString() };
  const pointsBalance = lifecycle.pointsBalance + points;
  const lifetimePointsEarned = lifecycle.lifetimePointsEarned + points;
  const tier = computeTier(lifetimePointsEarned);
  const transactions = [...lifecycle.transactions, transaction];

  await updateBusinessRecord(partnerId, "loyalty-rewards", loyaltyId, {
    ...record,
    pointsBalance,
    lifetimePointsEarned,
    tier,
    transactions,
  });
  revalidatePath(`/partner/${partnerId}/loyalty-rewards/${loyaltyId}`);
  return {};
}

/** Redeems points — fails closed if the balance is insufficient (same pattern as POS's stock check). */
export async function redeemPointsAction(partnerId: string, loyaltyId: string, points: number): Promise<{ error?: string }> {
  if (!(points > 0)) return { error: "Enter a points amount greater than zero." };
  const record = await getBusinessRecord(partnerId, "loyalty-rewards", loyaltyId);
  if (!record) return { error: "Loyalty record not found." };
  const lifecycle = extractLoyaltyLifecycleFromRecord(record);

  if (lifecycle.pointsBalance < points) {
    return { error: `Insufficient points balance (${lifecycle.pointsBalance} available, ${points} requested).` };
  }

  const transaction: LoyaltyTransaction = { id: `LT-${Date.now()}`, type: "Redeem", points, timestamp: new Date().toISOString() };
  const pointsBalance = lifecycle.pointsBalance - points;
  const transactions = [...lifecycle.transactions, transaction];
  const lastRedemption = new Date().toISOString().slice(0, 10);

  await updateBusinessRecord(partnerId, "loyalty-rewards", loyaltyId, {
    ...record,
    pointsBalance,
    transactions,
    lastRedemption,
  });
  revalidatePath(`/partner/${partnerId}/loyalty-rewards/${loyaltyId}`);
  return {};
}
