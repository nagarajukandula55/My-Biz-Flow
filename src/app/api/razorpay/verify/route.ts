import { NextResponse } from "next/server";
import { getVendor, updateVendorSubscription } from "@/lib/vendorData";
import { verifyPaymentSignature } from "@/lib/razorpay";

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

  return NextResponse.json({ ok: true });
}
