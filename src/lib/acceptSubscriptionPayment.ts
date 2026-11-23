import { enqueuePaymentDelivery } from "@/lib/paymentDeliveryQueue";
import { prisma } from "@/lib/prisma";
import { fetchPaymentAndOrder } from "@/lib/razorpay";
import { PaymentValidationError, validateCapturedSubscriptionPayment } from "@/lib/subscriptionPaymentPolicy";
import { env } from "@/lib/env";

/** One shared atomic acceptance path for Checkout and webhooks. No schema change needed. */
export async function acceptSubscriptionPayment(paymentId: string, orderId?: string, expectedPartnerId?: string) {
  const { payment, order } = await fetchPaymentAndOrder(paymentId, orderId);
  const accepted = validateCapturedSubscriptionPayment(payment, order, expectedPartnerId);
  const capturedAt = new Date(); // Time this application verified capture with the provider.
  const result = { ...accepted, razorpayPaymentId: paymentId, capturedAt };
  return prisma.$transaction(async (tx) => {
    // Serialize callbacks for this partner; the unique payment key also protects cross-partner replay.
    await tx.$queryRaw`SELECT id FROM partners WHERE id = ${accepted.partnerId} FOR UPDATE`;
    const existing = await tx.subscriptionPayment.findUnique({ where: { razorpayPaymentId: paymentId } });
    if (existing) {
      if (existing.partnerId !== accepted.partnerId || existing.amount !== accepted.amount || existing.currency !== "INR") {
        throw new PaymentValidationError("Recorded payment does not match this subscription.");
      }
      // An old payment must never re-activate a subsequently cancelled or changed subscription.
      return { ...result, newlyRecorded: false };
    }
    const partner = await tx.partner.findUnique({ where: { id: accepted.partnerId } });
    if (!partner || partner.planId !== accepted.planId || partner.billingCycle !== accepted.billingCycle ||
        partner.offerId !== accepted.offerId) {
      throw new PaymentValidationError("Subscription selection changed. Payment requires reconciliation before activation.");
    }
    await tx.subscriptionPayment.create({ data: {
      partnerId: accepted.partnerId, razorpayPaymentId: paymentId, amount: accepted.amount, currency: "INR", capturedAt,
    } });
    // Referral commission is paid once only, on the referred partner's
    // first-ever captured plan payment (not renewals).
    const priorPaymentCount = await tx.subscriptionPayment.count({
      where: { partnerId: accepted.partnerId, razorpayPaymentId: { not: paymentId } },
    });
    const isFirstPayment = priorPaymentCount === 0;
    const dealerRelationship = isFirstPayment ? await tx.distributorDealerRelationship.findUnique({
      where: { dealerPartnerId: accepted.partnerId },
      select: { distributorPartnerId: true, wholesaleCustomerId: true, referrerCustomerId: true },
    }) : null;
    const referringDealerRelationship = dealerRelationship?.referrerCustomerId
      ? await tx.distributorDealerRelationship.findUnique({
          where: { wholesaleCustomerId: dealerRelationship.referrerCustomerId },
          select: { dealerPartnerId: true },
        })
      : null;
    const networkReferrerPartnerId = dealerRelationship
      ? referringDealerRelationship?.dealerPartnerId ?? dealerRelationship.distributorPartnerId
      : null;
    // Dealer-network rewards always enqueue the platform-controlled 5%
    // wallet credit. The general referral feature flag still controls
    // non-network partner/staff referrals.
    const referrer = !isFirstPayment || (!dealerRelationship && !env.walletCommissionEnabled())
      ? undefined
      : networkReferrerPartnerId
        ? ({ type: "PARTNER", id: networkReferrerPartnerId } as const)
        : partner.referredByPartnerId
        ? ({ type: "PARTNER", id: partner.referredByPartnerId } as const)
        : partner.referredByStaffId
          ? ({ type: "STAFF", id: partner.referredByStaffId } as const)
          : undefined;
    await enqueuePaymentDelivery(tx, { partnerId: accepted.partnerId, razorpayPaymentId: paymentId, amount: accepted.amount, planName: accepted.planName, billingCycle: accepted.billingCycle, capturedAt: capturedAt.toISOString(), referrer });
    await tx.partner.update({ where: { id: accepted.partnerId }, data: { subscriptionStatus: "Active" } });
    if (isFirstPayment) {
      if (dealerRelationship) {
        const subscriptionAmountPaise = accepted.amount * 100;
        const rewardAmount = Math.round(subscriptionAmountPaise * 500 / 10000);
        await tx.wholesaleReferralReward.updateMany({
          where: { partnerId: dealerRelationship.distributorPartnerId, referredCustomerId: dealerRelationship.wholesaleCustomerId, status: "Pending" },
          data: {
            status: "Qualified",
            qualifyingSubscriptionPaymentId: paymentId,
            qualifyingSubscriptionAmount: subscriptionAmountPaise,
            rewardPercentBps: 500,
            rewardAmount,
            qualifiedAt: capturedAt,
          },
        });
      }
    }
    return { ...result, newlyRecorded: true };
  }, { maxWait: 5000, timeout: 10000 });
}
