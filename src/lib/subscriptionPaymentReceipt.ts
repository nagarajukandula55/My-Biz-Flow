import { processPaymentDelivery, type DeliveryJob } from "@/lib/paymentDeliveryQueue";
import { getPartner } from "@/lib/partnerData";
import { notifyCentralApiSale } from "@/lib/centralApi";
import { sendPlatformSubscriptionPaymentEmail } from "@/lib/email";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { paymentReceivedMessage } from "@/lib/telegramTemplates";
import { cycleLabel } from "@/lib/subscriptionData";
import { logError } from "@/lib/errorLog";
import type { acceptSubscriptionPayment } from "@/lib/acceptSubscriptionPayment";

export async function sendPaymentDelivery(job: DeliveryJob): Promise<boolean> {
  const payment = { ...job.payment, capturedAt: new Date(job.payment.capturedAt) };
  const partner = await getPartner(payment.partnerId);
  if (!partner) return false;
  const amount = `₹${payment.amount.toLocaleString("en-IN")}`;
  if (job.channel === "accounting") return notifyCentralApiSale({ ...partner, billingCycle: payment.billingCycle }, payment.planName, payment);
  if (job.channel === "email") return (await sendPlatformSubscriptionPaymentEmail({ to: partner.businessEmail,
    businessName: partner.businessName, planName: payment.planName, amount, billingCycle: cycleLabel(payment.billingCycle),
    invoiceNumber: `PLT-${payment.razorpayPaymentId}` })).sent;
  if (job.channel === "telegram") return sendPartnerTelegramAlert(partner.id, "paymentReceived", await paymentReceivedMessage({
    partnerBusinessName: partner.businessName, amount, planName: payment.planName }));
  return false;
}

export async function deliverSubscriptionPaymentReceipt(payment: Awaited<ReturnType<typeof acceptSubscriptionPayment>>) {
  if (!payment.newlyRecorded) return;
  try {
    for (let i = 0; i < 3; i++) if (!await processPaymentDelivery(sendPaymentDelivery, payment.razorpayPaymentId)) break;
  } catch {
    await logError({ message: `Payment recorded; durable delivery jobs require review: ${payment.razorpayPaymentId}`,
      source: "subscriptionPaymentReceipt", severity: "error" }).catch(() => {});
  }
}
