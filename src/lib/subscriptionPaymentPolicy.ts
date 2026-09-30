import type { CapturedPayment, PaidOrder } from "@/lib/razorpay";

export class PaymentValidationError extends Error {}

/** Order notes originate in our server-side create-order route, never Checkout form data. */
export function validateCapturedSubscriptionPayment(payment: CapturedPayment, order: PaidOrder, expectedPartnerId?: string) {
  const notes = order.notes;
  if (!notes || typeof notes.partnerId !== "string" || !notes.partnerId ||
      typeof notes.planId !== "string" || !notes.planId ||
      !["Yearly", "TwoYearly"].includes(notes.billingCycle) ||
      (expectedPartnerId !== undefined && notes.partnerId !== expectedPartnerId)) {
    throw new PaymentValidationError("Payment does not match this partner's subscription.");
  }
  if (payment.order_id !== order.id || payment.status !== "captured" || payment.captured !== true ||
      payment.amount_refunded !== 0 || order.status !== "paid" || order.amount_due !== 0 ||
      payment.currency !== "INR" || order.currency !== "INR" ||
      !Number.isSafeInteger(payment.amount) || payment.amount <= 0 ||
      payment.amount !== order.amount || order.amount_paid !== order.amount) {
    throw new PaymentValidationError("Payment is not a fully captured matching INR order.");
  }
  // The existing database stores whole rupees as Int; do not silently round a payment.
  if (payment.amount % 100 !== 0) throw new PaymentValidationError("Fractional-rupee payment requires reconciliation.");
  return { partnerId: notes.partnerId, planId: notes.planId, billingCycle: notes.billingCycle,
    offerId: notes.offerId || null, planName: notes.planName || notes.planId, amount: payment.amount / 100 };
}
