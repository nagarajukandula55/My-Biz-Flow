import { NextResponse } from "next/server";
import { getPartner, updatePartnerSubscription } from "@/lib/partnerData";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { computePartnerDueAmount, cycleLabel } from "@/lib/subscriptionData";
import { prisma } from "@/lib/prisma";
import { notifyCentralApiSale } from "@/lib/centralApi";
import { getSessionPartnerId } from "@/lib/requirePartnerSession";
import { sendPlatformSubscriptionPaymentEmail } from "@/lib/email";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { paymentReceivedMessage } from "@/lib/telegramTemplates";
import { logError } from "@/lib/errorLog";

/**
 * Verifies a Checkout success callback's signature, then activates the
 * partner's subscription. partnerId comes from the signed-in session
 * cookie, not the request body — same reasoning as create-order/route.ts.
 * The signature check below already prevented forging a payment, but a
 * caller could otherwise have named a DIFFERENT partnerId than the one who
 * actually paid and activated that partner's subscription instead.
 */
export async function POST(request: Request) {
  const partnerId = await getSessionPartnerId();
  if (!partnerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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

      // Receipt to the partner — email + Telegram — only reached when THIS
      // call is the one that actually inserted the payment row (the
      // unique-constraint catch below skips it if the webhook already won
      // the race), so a partner never gets two receipts for one payment.
      const receiptVars = {
        to: partner.businessEmail,
        businessName: partner.businessName,
        planName: due.planName,
        amount: `₹${due.amount.toLocaleString("en-IN")}`,
        billingCycle: cycleLabel(partner.billingCycle ?? ""),
        invoiceNumber: `PLT-${razorpay_payment_id}`,
      };
      sendPlatformSubscriptionPaymentEmail(receiptVars).catch((err) =>
        console.error(`[razorpay/verify] Failed to send payment receipt email for partner ${partner.id}:`, err)
      );
      sendPartnerTelegramAlert(
        partner.id,
        "paymentReceived",
        await paymentReceivedMessage({ partnerBusinessName: partner.businessName, amount: receiptVars.amount, planName: due.planName })
      ).catch((err) =>
        console.error(`[razorpay/verify] Failed to send payment Telegram alert for partner ${partner.id}:`, err)
      );
    } catch (err) {
      // Unique constraint violation means this payment was already
      // recorded (e.g. by the webhook) — not an error, just a no-op.
      const alreadyRecorded =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (!alreadyRecorded) {
        console.error("[razorpay/verify] Failed to persist/notify subscription payment:", err);
        logError({
          message: `Failed to persist subscription payment for partner ${partner.id} (razorpay_payment_id=${razorpay_payment_id}): ${
            err instanceof Error ? err.message : String(err)
          }`,
          source: "api/razorpay/verify",
          severity: "error",
        }).catch((logErr) => console.error("[razorpay/verify] Failed to persist error log entry:", logErr));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
