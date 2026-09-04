import { NextResponse } from "next/server";
import { getPartner, updatePartnerSubscription } from "@/lib/partnerData";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { computePartnerDueAmount } from "@/lib/subscriptionData";
import { prisma } from "@/lib/prisma";
import { notifyCentralApiSale } from "@/lib/centralApi";

/** Verifies a Checkout success callback's signature, then activates the partner's subscription. */
export async function POST(request: Request) {
  const { partnerId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  if (!partnerId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Verification failed" }, { status: 502 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });

  const partner = await getPartner(partnerId);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  await updatePartnerSubscription(partner.id, {
    subscriptionStatus: "Active",
    trialStartAt: partner.trialStartAt,
    trialEndAt: partner.trialEndAt,
    billingCycle: partner.billingCycle,
    planId: partner.planId,
    offerId: partner.offerId,
  });

  // Persist the payment (previously discarded entirely) and push it to
  // AN-Accounting. Idempotent on razorpay_payment_id — if this route and
  // the backup webhook both fire for the same payment, only the first one
  // to insert wins; the second silently no-ops rather than double-posting.
  const due = await computePartnerDueAmount(partner);
  if (due) {
    const capturedAt = new Date();
    try {
      await prisma.subscriptionPayment.create({
        data: {
          partnerId: partner.id,
          razorpayPaymentId: razorpay_payment_id,
          amount: due.amount,
          capturedAt,
        },
      });
      await notifyCentralApiSale(partner, due.planName, {
        razorpayPaymentId: razorpay_payment_id,
        amount: due.amount,
        capturedAt,
      });
    } catch (err) {
      // Unique constraint violation means this payment was already
      // recorded (e.g. by the webhook) — not an error, just a no-op.
      const alreadyRecorded =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (!alreadyRecorded) {
        console.error("[razorpay/verify] Failed to persist/notify subscription payment:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
