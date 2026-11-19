import { NextResponse } from "next/server";
import { createBookingPaymentOrder } from "@/lib/fieldForce/payments";

/** Creates a Razorpay Order for one Booking's price. */
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { partnerId, bookingId } = (body ?? {}) as Record<string, unknown>;
  if (typeof partnerId !== "string" || typeof bookingId !== "string" || !partnerId || !bookingId) {
    return NextResponse.json({ error: "partnerId and bookingId are required" }, { status: 400 });
  }

  try {
    const order = await createBookingPaymentOrder(bookingId, partnerId);
    return NextResponse.json({ orderId: order.orderId, amount: order.amount, currency: order.currency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order creation failed";
    const status = /authorized|paid/i.test(message) ? 403 : 502;
    return NextResponse.json({ error: status === 403 ? "Not authorized" : "Order creation failed" }, { status });
  }
}
