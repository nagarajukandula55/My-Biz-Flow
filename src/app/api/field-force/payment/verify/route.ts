import { NextResponse } from "next/server";
import { verifyBookingPayment } from "@/lib/fieldForce/payments";

/** Verifies a Checkout success callback's signature, then marks the Booking paid. */
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { partnerId, bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = (body ?? {}) as Record<string, unknown>;
  if (![partnerId, bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature].every((value) => typeof value === "string" && value)) {
    return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
  }
  const input = {
    partnerId: partnerId as string,
    bookingId: bookingId as string,
    orderId: razorpay_order_id as string,
    paymentId: razorpay_payment_id as string,
    signature: razorpay_signature as string,
  };

  try {
    await verifyBookingPayment(input.bookingId, input.partnerId, input.orderId, input.paymentId, input.signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    const status = message === "Invalid payment signature" || /does not match|does not belong|already completed/i.test(message) ? 400 : /authorized/i.test(message) ? 403 : 502;
    return NextResponse.json({ error: status === 403 ? "Not authorized" : status === 400 ? "Payment verification failed" : "Payment verification unavailable" }, { status });
  }

  return NextResponse.json({ ok: true });
}
