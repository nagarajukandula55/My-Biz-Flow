import { prisma } from "@/lib/prisma";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { getPlan } from "@/lib/plansData";

export const DEALER_REFERRAL_PERCENT_BPS = 500;

export async function getWholesaleReferralProgram(partnerId: string) {
  return prisma.wholesaleReferralProgram.findUnique({ where: { partnerId } });
}

export async function saveWholesaleReferralProgram(partnerId: string, input: { enabled: boolean; dealerPartnerTypeId: string }) {
  const dealerType = await getPartnerType(input.dealerPartnerTypeId);
  const requiredModules = ["wholesale-b2b", "inventory", "pos", "billing"];
  if (!dealerType || dealerType.status !== "Active" || requiredModules.some((module) => !dealerType.defaultModules.includes(module))) {
    throw new Error("Choose an active dealer business type that includes Wholesale B2B, Inventory, POS and Billing.");
  }
  const plans = await Promise.all(dealerType.planIds.map((id) => getPlan(id)));
  if (!plans.some((plan) => plan?.isPublic && requiredModules.every((module) => plan.includedModuleSlugs.includes(module)))) {
    throw new Error("At least one public dealer plan must include Wholesale B2B, Inventory, POS and Billing.");
  }
  return prisma.wholesaleReferralProgram.upsert({
    where: { partnerId },
    create: { partnerId, ...input, rewardAmount: 0, rewardPercentBps: DEALER_REFERRAL_PERCENT_BPS },
    update: { ...input, rewardAmount: 0, rewardPercentBps: DEALER_REFERRAL_PERCENT_BPS },
  });
}

export async function listWholesaleReferralRewards(partnerId: string) {
  return prisma.wholesaleReferralReward.findMany({
    where: { partnerId },
    include: {
      referrer: { select: { name: true, contact: true } },
      referred: { select: { name: true, contact: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateWholesaleReferralReward(partnerId: string, rewardId: string, status: "Approved" | "Paid" | "Rejected", payoutReference?: string) {
  const reward = await prisma.wholesaleReferralReward.findFirst({ where: { id: rewardId, partnerId } });
  if (!reward) throw new Error("Referral reward not found.");
  if (status === "Approved" && reward.status !== "Qualified") throw new Error("Only qualified rewards can be approved.");
  if (status === "Paid" && reward.status !== "Approved") throw new Error("Approve the reward before recording payout.");
  if (status === "Rejected" && !["Pending", "Qualified"].includes(reward.status)) throw new Error("This reward can no longer be rejected.");
  if (status === "Paid" && !payoutReference?.trim()) throw new Error("Add the UTR or payout reference to record payment.");
  return prisma.wholesaleReferralReward.update({
    where: { id: reward.id },
    data: {
      status,
      ...(status === "Approved" ? { approvedAt: new Date() } : {}),
      ...(status === "Paid" ? { paidAt: new Date(), payoutReference: payoutReference!.trim() } : {}),
    },
  });
}
