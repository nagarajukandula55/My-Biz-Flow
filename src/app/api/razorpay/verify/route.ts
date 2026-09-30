import { NextResponse } from "next/server";
import { getSessionPartnerId } from "@/lib/requirePartnerSession";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { acceptSubscriptionPayment } from "@/lib/acceptSubscriptionPayment";
import { PaymentValidationError } from "@/lib/subscriptionPaymentPolicy";
import { deliverSubscriptionPaymentReceipt } from "@/lib/subscriptionPaymentReceipt";

export async function POST(request: Request) {
  const partnerId = await getSessionPartnerId();
  if (!partnerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body ?? {};
  if (typeof orderId !== "string" || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
    return NextResponse.json({ error: "Invalid verification fields" }, { status: 400 });
  }
  try {
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }
    const result = await acceptSubscriptionPayment(paymentId, orderId, partnerId);
    await deliverSubscriptionPaymentReceipt(result);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentValidationError ? error.message : "Payment verification unavailable. Please retry." },
      { status: error instanceof PaymentValidationError ? 409 : 502 });
  }
}
