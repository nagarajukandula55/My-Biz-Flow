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
    const results = await Promise.allSettled([
      notifyCentralApiSale({ ...partner, billingCycle: payment.billingCycle }, payment.planName, payment),
      sendPlatformSubscriptionPaymentEmail({ to: partner.businessEmail, businessName: partner.businessName,
        planName: payment.planName, amount, billingCycle: cycleLabel(payment.billingCycle), invoiceNumber: `PLT-${payment.razorpayPaymentId}` }),
      paymentReceivedMessage({ partnerBusinessName: partner.businessName, amount, planName: payment.planName })
        .then((message) => sendPartnerTelegramAlert(partner.id, "paymentReceived", message)),
    ]);
    const channels = ["accounting", "email", "telegram"];
    const failed = results.flatMap((result, index) => result.status === "rejected" || result.value === false ||
      (typeof result.value === "object" && result.value !== null && "sent" in result.value && !result.value.sent) ? [channels[index]] : []);
    if (failed.length) throw new Error(`Receipt channels require review: ${failed.join(", ")}`);
  } catch {
    await logError({ message: `Payment recorded but receipt delivery needs review: ${payment.razorpayPaymentId}`,
      source: "subscriptionPaymentReceipt", severity: "error" }).catch(() => {});
  }
}
