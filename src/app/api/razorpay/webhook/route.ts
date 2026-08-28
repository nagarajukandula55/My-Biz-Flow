import { NextResponse } from "next/server";
import { getVendor, updateVendorSubscription } from "@/lib/vendorData";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { computeVendorDueAmount } from "@/lib/subscriptionData";
import { prisma } from "@/lib/prisma";
import { notifyCentralApiSale } from "@/lib/centralApi";

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
    const paymentEntity = payload.payload?.payment?.entity;
    const vendorId = paymentEntity?.notes?.vendorId as string | undefined;
    if (vendorId) {
      const vendor = await getVendor(vendorId);
      if (vendor) {
        if (vendor.subscriptionStatus !== "Active") {
          await updateVendorSubscription(vendor.id, {
            subscriptionStatus: "Active",
            trialStartAt: vendor.trialStartAt,
            trialEndAt: vendor.trialEndAt,
            billingCycle: vendor.billingCycle,
            planId: vendor.planId,
            offerId: vendor.offerId,
          });
        }

        // Same idempotent persist+notify as /api/razorpay/verify — whichever
        // of the two fires first for a given payment id wins; the other
        // no-ops on the unique constraint.
        const due = await computeVendorDueAmount(vendor);
        if (due && paymentEntity?.id) {
          const capturedAt = paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : new Date();
          try {
            await prisma.subscriptionPayment.create({
              data: {
                vendorId: vendor.id,
                razorpayPaymentId: paymentEntity.id,
                amount: due.amount,
                capturedAt,
              },
            });
            await notifyCentralApiSale(vendor, due.planName, {
              razorpayPaymentId: paymentEntity.id,
              amount: due.amount,
              capturedAt,
            });
          } catch (err) {
            const alreadyRecorded =
              err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
            if (!alreadyRecorded) {
              console.error("[razorpay/webhook] Failed to persist/notify subscription payment:", err);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
