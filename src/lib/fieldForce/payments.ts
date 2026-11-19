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
import { createOrder, fetchPaymentAndOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { settleBooking } from "@/lib/fieldForce/commission";
import { getCurrentCustomer } from "@/lib/fieldForce/customerAuth";
import { getSessionPartnerId } from "@/lib/requirePartnerSession";

/** Authorizes either the booking's customer or its partner owner. Never permit anonymous payment mutations. */
async function requireBookingPaymentAccess(booking: { partnerId: string; customerId: string }): Promise<void> {
  const ownerPartnerId = await getSessionPartnerId();
  if (ownerPartnerId === booking.partnerId) return;
  const customer = await getCurrentCustomer(booking.partnerId);
  if (customer?.id === booking.customerId) return;
  throw new Error("Not authorized to pay for this booking.");
}

export async function createBookingPaymentOrder(bookingId: string, partnerId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  assertPartnerScope(partnerId, booking.partnerId);
  await requireBookingPaymentAccess(booking);

  if (booking.paymentStatus === "paid") throw new Error("This booking is already paid.");

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
  await requireBookingPaymentAccess(booking);

  const valid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new Error("Invalid payment signature");

  const paymentRecord = await prisma.bookingPayment.findFirst({ where: { bookingId, razorpayOrderId } });
  if (!paymentRecord) throw new Error("Payment order does not belong to this booking.");
  if (paymentRecord.status === "paid") {
    if (paymentRecord.razorpayPaymentId === razorpayPaymentId) return;
    throw new Error("Payment order was already completed.");
  }

  const { payment, order } = await fetchPaymentAndOrder(razorpayPaymentId, razorpayOrderId);
  if (
    payment.status !== "captured" || !payment.captured || payment.amount_refunded > 0 ||
    payment.amount !== paymentRecord.amount || payment.currency !== paymentRecord.currency ||
    order.id !== paymentRecord.razorpayOrderId || order.amount !== paymentRecord.amount ||
    order.currency !== paymentRecord.currency || order.amount_paid !== paymentRecord.amount ||
    order.amount_due !== 0 || order.notes?.bookingId !== bookingId || order.notes?.partnerId !== booking.partnerId
  ) {
    throw new Error("Payment does not match this booking.");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.bookingPayment.updateMany({
      where: { id: paymentRecord.id, status: "created", razorpayPaymentId: null },
      data: { razorpayPaymentId, status: "paid" },
    });
    if (updated.count !== 1) throw new Error("Payment was already processed. Refresh the booking before retrying.");
    await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus: "paid" } });
  });
}
