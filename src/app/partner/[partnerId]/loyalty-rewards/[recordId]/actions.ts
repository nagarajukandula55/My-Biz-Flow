"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { earnPoints, redeemPoints } from "@/lib/loyaltyRewards";

/** Earns points from a linked purchase amount (points = amount * EARN_RATE, rounded). */
export async function earnPointsAction(partnerId: string, loyaltyId: string, amount: number): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const result = await earnPoints(partnerId, loyaltyId, amount);
  if (result.error) return result;
  revalidatePath(`/partner/${partnerId}/loyalty-rewards/${loyaltyId}`);
  return {};
}

/** Redeems points — fails closed if the balance is insufficient (same pattern as POS's stock check). */
export async function redeemPointsAction(partnerId: string, loyaltyId: string, points: number): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const result = await redeemPoints(partnerId, loyaltyId, points);
  if (result.error) return result;
  revalidatePath(`/partner/${partnerId}/loyalty-rewards/${loyaltyId}`);
  return {};
}
