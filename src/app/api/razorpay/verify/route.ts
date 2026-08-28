import { NextResponse } from "next/server";
import { getVendor, updateVendorSubscription } from "@/lib/vendorData";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { computeVendorDueAmount } from "@/lib/subscriptionData";
import { prisma } from "@/lib/prisma";
import { notifyCentralApiSale } from "@/lib/centralApi";

/** Verifies a Checkout success callback's signature, then activates the vendor's subscription. */
export async function POST(request: Request) {
  const { vendorId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  if (!vendorId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Verification failed" }, { status: 502 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });

  const vendor = await getVendor(vendorId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  await updateVendorSubscription(vendor.id, {
    subscriptionStatus: "Active",
    trialStartAt: vendor.trialStartAt,
    trialEndAt: vendor.trialEndAt,
    billingCycle: vendor.billingCycle,
    planId: vendor.planId,
    offerId: vendor.offerId,
  });

  // Persist the payment (previously discarded entirely) and push it to
  // AN-Accounting. Idempotent on razorpay_payment_id — if this route and
  // the backup webhook both fire for the same payment, only the first one
  // to insert wins; the second silently no-ops rather than double-posting.
  const due = await computeVendorDueAmount(vendor);
  if (due) {
    const capturedAt = new Date();
    try {
      await prisma.subscriptionPayment.create({
        data: {
          vendorId: vendor.id,
          razorpayPaymentId: razorpay_payment_id,
          amount: due.amount,
          capturedAt,
        },
      });
      await notifyCentralApiSale(vendor, due.planName, {
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
