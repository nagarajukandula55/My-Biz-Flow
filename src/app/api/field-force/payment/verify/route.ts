import { NextResponse } from "next/server";
import { verifyBookingPayment } from "@/lib/fieldForce/payments";

/** Verifies a Checkout success callback's signature, then marks the Booking paid. */
export async function POST(request: Request) {
  const { partnerId, bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  if (!partnerId || !bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
  }

  try {
    await verifyBookingPayment(bookingId, partnerId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: message === "Invalid payment signature" ? 400 : 502 });
  }

  return NextResponse.json({ ok: true });
}
