import { getPartner } from "@/lib/partnerData";
import { notifyCentralApiSale } from "@/lib/centralApi";
import { sendPlatformSubscriptionPaymentEmail } from "@/lib/email";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { paymentReceivedMessage } from "@/lib/telegramTemplates";
import { cycleLabel } from "@/lib/subscriptionData";
import { logError } from "@/lib/errorLog";
import type { acceptSubscriptionPayment } from "@/lib/acceptSubscriptionPayment";

export async function deliverSubscriptionPaymentReceipt(payment: Awaited<ReturnType<typeof acceptSubscriptionPayment>>) {
  if (!payment.newlyRecorded) return;
  try {
    const partner = await getPartner(payment.partnerId);
    if (!partner) throw new Error("Partner unavailable for receipt.");
    const amount = `₹${payment.amount.toLocaleString("en-IN")}`;
    await Promise.all([
      notifyCentralApiSale({ ...partner, billingCycle: payment.billingCycle }, payment.planName, payment),
      sendPlatformSubscriptionPaymentEmail({ to: partner.businessEmail, businessName: partner.businessName,
        planName: payment.planName, amount, billingCycle: cycleLabel(payment.billingCycle), invoiceNumber: `PLT-${payment.razorpayPaymentId}` }),
      paymentReceivedMessage({ partnerBusinessName: partner.businessName, amount, planName: payment.planName })
        .then((message) => sendPartnerTelegramAlert(partner.id, "paymentReceived", message)),
    ]);
  } catch {
    await logError({ message: `Payment recorded but receipt delivery needs review: ${payment.razorpayPaymentId}`,
      source: "subscriptionPaymentReceipt", severity: "error" }).catch(() => {});
  }
}
