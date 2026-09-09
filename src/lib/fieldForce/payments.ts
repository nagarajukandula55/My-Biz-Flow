/**
 * Booking payment collection — mirrors the SubscriptionPayment flow
 * (src/app/api/razorpay/create-order + verify, src/lib/razorpay.ts) but
 * settles a Booking instead of a partner subscription. Kept as its own
 * BookingPayment table/route pair rather than reusing SubscriptionPayment,
 * since a booking payment isn't a subscription charge. Charges the
 * customer whatever settleBooking() computes (finalPrice/priceAmount plus
 * the platform's own commission split — see commission.ts), not the raw
 * quoted price.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { createOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { settleBooking } from "@/lib/fieldForce/commission";

export async function createBookingPaymentOrder(bookingId: string, partnerId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  assertPartnerScope(partnerId, booking.partnerId);

  const settlement = await settleBooking(bookingId);

  const order = await createOrder(settlement.customerPayable, `booking-${booking.bookingNumber}`, {
    bookingId: booking.id,
    partnerId,
  });
  await prisma.bookingPayment.create({
    data: { bookingId, razorpayOrderId: order.id, amount: order.amount, currency: order.currency },
  });
  return { orderId: order.id, amount: order.amount, currency: order.currency, bookingNumber: booking.bookingNumber };
}

export async function verifyBookingPayment(
  bookingId: string,
  partnerId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<void> {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  assertPartnerScope(partnerId, booking.partnerId);

  const valid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new Error("Invalid payment signature");

  await prisma.$transaction([
    prisma.bookingPayment.updateMany({
      where: { bookingId, razorpayOrderId },
      data: { razorpayPaymentId, status: "paid" },
    }),
    prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "paid" } }),
  ]);
}
