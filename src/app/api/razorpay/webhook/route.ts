import { NextResponse } from "next/server";
import { getVendor, updateVendorSubscription } from "@/lib/vendorData";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Optional: only fires if a webhook is registered in the Razorpay
 * dashboard pointing here. The primary activation path is
 * /api/razorpay/verify (Checkout success signature) — this is a backup
 * for payments confirmed asynchronously (e.g. UPI collect requests).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Webhook not configured" }, { status: 502 });
  }
  if (!valid) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });

  const payload = JSON.parse(rawBody);
  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    const vendorId = payload.payload?.payment?.entity?.notes?.vendorId as string | undefined;
    if (vendorId) {
      const vendor = await getVendor(vendorId);
      if (vendor && vendor.subscriptionStatus !== "Active") {
        await updateVendorSubscription(vendor.id, {
          subscriptionStatus: "Active",
          trialStartAt: vendor.trialStartAt,
          trialEndAt: vendor.trialEndAt,
          billingCycle: vendor.billingCycle,
          planId: vendor.planId,
          offerId: vendor.offerId,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
