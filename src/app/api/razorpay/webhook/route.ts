import { NextResponse } from "next/server";
import { getPartner, updatePartnerSubscription } from "@/lib/partnerData";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { computePartnerDueAmount, cycleLabel } from "@/lib/subscriptionData";
import { prisma } from "@/lib/prisma";
import { notifyCentralApiSale } from "@/lib/centralApi";
import { sendPlatformSubscriptionPaymentEmail } from "@/lib/email";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { paymentReceivedMessage } from "@/lib/telegramTemplates";
import { logError } from "@/lib/errorLog";

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
    const partnerId = paymentEntity?.notes?.partnerId as string | undefined;
    if (partnerId) {
      const partner = await getPartner(partnerId);
      if (partner) {
        if (partner.subscriptionStatus !== "Active") {
          await updatePartnerSubscription(partner.id, {
            subscriptionStatus: "Active",
            trialStartAt: partner.trialStartAt,
            trialEndAt: partner.trialEndAt,
            billingCycle: partner.billingCycle,
            planId: partner.planId,
            offerId: partner.offerId,
          });
        }

        // Same idempotent persist+notify as /api/razorpay/verify — whichever
        // of the two fires first for a given payment id wins; the other
        // no-ops on the unique constraint.
        const due = await computePartnerDueAmount(partner);
        if (due && paymentEntity?.id) {
          const capturedAt = paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : new Date();
          try {
            await prisma.subscriptionPayment.create({
              data: {
                partnerId: partner.id,
                razorpayPaymentId: paymentEntity.id,
                amount: due.amount,
                capturedAt,
              },
            });
            await notifyCentralApiSale(partner, due.planName, {
              razorpayPaymentId: paymentEntity.id,
              amount: due.amount,
              capturedAt,
            });

            // Same receipt as /api/razorpay/verify — only reached when THIS
            // call wins the insert race, so no duplicate receipts.
            const receiptVars = {
              to: partner.businessEmail,
              businessName: partner.businessName,
              planName: due.planName,
              amount: `₹${due.amount.toLocaleString("en-IN")}`,
              billingCycle: cycleLabel(partner.billingCycle ?? ""),
              invoiceNumber: `PLT-${paymentEntity.id}`,
            };
            sendPlatformSubscriptionPaymentEmail(receiptVars).catch(() => {});
            sendPartnerTelegramAlert(
              partner.id,
              "paymentReceived",
              await paymentReceivedMessage({ partnerBusinessName: partner.businessName, amount: receiptVars.amount, planName: due.planName })
            ).catch(() => {});
          } catch (err) {
            const alreadyRecorded =
              err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
            if (!alreadyRecorded) {
              console.error("[razorpay/webhook] Failed to persist/notify subscription payment:", err);
              logError({
                message: `Failed to persist subscription payment for partner ${partner.id} (razorpay_payment_id=${paymentEntity.id}): ${
                  err instanceof Error ? err.message : String(err)
                }`,
                source: "api/razorpay/webhook",
                severity: "error",
              }).catch(() => {});
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
