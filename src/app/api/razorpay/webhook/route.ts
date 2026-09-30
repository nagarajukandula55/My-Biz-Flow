import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { acceptSubscriptionPayment } from "@/lib/acceptSubscriptionPayment";
import { PaymentValidationError } from "@/lib/subscriptionPaymentPolicy";
import { deliverSubscriptionPaymentReceipt } from "@/lib/subscriptionPaymentReceipt";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  try {
    if (!verifyWebhookSignature(rawBody, signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  } catch { return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 502 }); }
  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  if (payload?.event !== "payment.captured" && payload?.event !== "order.paid") return NextResponse.json({ ok: true });
  const paymentId = payload?.payload?.payment?.entity?.id;
  if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    return NextResponse.json({ error: "Missing payment identifier" }, { status: 400 });
  }
  try {
    // Resolve ownership from the server-created order, never webhook payment notes.
    const result = await acceptSubscriptionPayment(paymentId);
    await deliverSubscriptionPaymentReceipt(result);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentValidationError ? error.message : "Payment verification unavailable" },
      { status: error instanceof PaymentValidationError ? 409 : 502 });
  }
}
