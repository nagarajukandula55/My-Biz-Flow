import { enqueuePaymentDelivery } from "@/lib/paymentDeliveryQueue";
import { prisma } from "@/lib/prisma";
import { fetchPaymentAndOrder } from "@/lib/razorpay";
import { PaymentValidationError, validateCapturedSubscriptionPayment } from "@/lib/subscriptionPaymentPolicy";

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
    await enqueuePaymentDelivery(tx, { partnerId: accepted.partnerId, razorpayPaymentId: paymentId, amount: accepted.amount, planName: accepted.planName, billingCycle: accepted.billingCycle, capturedAt: capturedAt.toISOString() });
    await tx.partner.update({ where: { id: accepted.partnerId }, data: { subscriptionStatus: "Active" } });
    return { ...result, newlyRecorded: true };
  }, { maxWait: 5000, timeout: 10000 });
}
