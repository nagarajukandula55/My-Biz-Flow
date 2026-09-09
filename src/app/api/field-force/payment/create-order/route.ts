import { NextResponse } from "next/server";
import { createBookingPaymentOrder } from "@/lib/fieldForce/payments";

/** Creates a Razorpay Order for one Booking's price. */
export async function POST(request: Request) {
  const { partnerId, bookingId } = await request.json();
  if (!partnerId || !bookingId) {
    return NextResponse.json({ error: "partnerId and bookingId are required" }, { status: 400 });
  }

  try {
    const order = await createBookingPaymentOrder(bookingId, partnerId);
    return NextResponse.json({ orderId: order.orderId, amount: order.amount, currency: order.currency });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Order creation failed" }, { status: 502 });
  }
}
