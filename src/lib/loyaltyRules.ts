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

