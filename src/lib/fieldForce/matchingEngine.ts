/**
 * Automated dispatch: when a Customer requests a booking, find matching
 * Providers by service + pincode and fan out a JobOffer to each (capped),
 * notifying ops and every candidate. The first Provider to accept confirms
 * the booking; every sibling offer expires. If nobody accepts, ops gets a
 * fallback notification to dispatch manually from the Allocations page.
 */
import { prisma } from "@/lib/prisma";
import { findEligibleProviders } from "@/lib/fieldForce/matching";
import { listProviders } from "@/lib/fieldForce/providersData";
import { notify } from "@/lib/fieldForce/notifications";
import { sendSms } from "@/lib/sms";

const MAX_OFFERS_PER_BOOKING = 10;

export async function dispatchBookingRequest(bookingId: string): Promise<{ offeredCount: number }> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { address: true, service: true },
  });

  const providers = await listProviders(booking.partnerId);
  const candidates = findEligibleProviders(providers, {
    pincode: booking.address.pincode,
    state: booking.address.state,
    requiredServiceIds: [booking.serviceId],
  }).slice(0, MAX_OFFERS_PER_BOOKING);

  await notify({
    partnerId: booking.partnerId,
    audience: "ops",
    type: "booking-requested",
    title: `New booking ${booking.bookingNumber}`,
    body: `${booking.service.name} in ${booking.address.pincode} — ${candidates.length} provider(s) notified.`,
    relatedBookingId: booking.id,
  });

  for (const provider of candidates) {
    await prisma.jobOffer.create({
      data: { bookingId: booking.id, providerId: provider.id, partnerId: booking.partnerId },
    });
    await notify({
      partnerId: booking.partnerId,
      audience: "provider",
      recipientId: provider.id,
      type: "job-offer",
      title: `New job: ${booking.service.name}`,
      body: `${booking.address.pincode} — ${booking.slotLabel} on ${booking.scheduledAt.toDateString()}. Standard rate ₹${(booking.priceAmount / 100).toLocaleString("en-IN")}.`,
      relatedBookingId: booking.id,
    });
    await sendSms(
      provider.phone,
      `New job available: ${booking.service.name} (${booking.address.pincode}), ${booking.slotLabel}. Open your dashboard to accept.`
    );
  }

  if (candidates.length === 0) {
    await notify({
      partnerId: booking.partnerId,
      audience: "ops",
      type: "no-match",
      title: `No providers matched ${booking.bookingNumber}`,
      body: "No active provider covers this service/pincode yet — dispatch manually from Job Allocation.",
      relatedBookingId: booking.id,
    });
  }

  return { offeredCount: candidates.length };
}

export async function respondToOffer(
  offerId: string,
  providerId: string,
  response: "accepted" | "declined"
): Promise<void> {
  const offer = await prisma.jobOffer.findUniqueOrThrow({ where: { id: offerId }, include: { booking: true } });
  if (offer.providerId !== providerId) {
    throw new Error("This offer does not belong to the responding provider.");
  }
  if (offer.status !== "pending") return; // already resolved (e.g. another offer was accepted first)

  if (response === "declined") {
    await prisma.jobOffer.update({ where: { id: offerId }, data: { status: "declined", respondedAt: new Date() } });

    const remaining = await prisma.jobOffer.count({ where: { bookingId: offer.bookingId, status: "pending" } });
    if (remaining === 0) {
      await notify({
        partnerId: offer.partnerId,
        audience: "ops",
        type: "no-accept",
        title: `No provider accepted ${offer.booking.bookingNumber}`,
        body: "Every offered provider declined — dispatch manually from Job Allocation.",
        relatedBookingId: offer.bookingId,
      });
    }
    return;
  }

  // Accepted: this offer wins, every sibling offer for the same booking expires.
  await prisma.$transaction([
    prisma.jobOffer.update({ where: { id: offerId }, data: { status: "accepted", respondedAt: new Date() } }),
    prisma.jobOffer.updateMany({
      where: { bookingId: offer.bookingId, status: "pending", id: { not: offerId } },
      data: { status: "expired", respondedAt: new Date() },
    }),
    prisma.booking.update({ where: { id: offer.bookingId }, data: { providerId, status: "confirmed" } }),
    prisma.jobAllocation.create({
      data: { partnerId: offer.partnerId, bookingId: offer.bookingId, providerId, status: "confirmed" },
    }),
  ]);

  await notify({
    partnerId: offer.partnerId,
    audience: "customer",
    recipientId: offer.booking.customerId,
    type: "booking-confirmed",
    title: `Booking ${offer.booking.bookingNumber} confirmed`,
    body: "A provider has accepted your booking. Their contact details are now visible on your booking page.",
    relatedBookingId: offer.bookingId,
  });
}

/** Used by the Provider dashboard — offers still awaiting a response for this provider. */
export async function listPendingOffersForProvider(providerId: string, partnerId: string) {
  const rows = await prisma.jobOffer.findMany({
    where: { providerId, partnerId, status: "pending" },
    include: { booking: { include: { service: true, address: true } } },
    orderBy: { sentAt: "desc" },
  });
  return rows.map((r) => ({
    offerId: r.id,
    bookingId: r.bookingId,
    bookingNumber: r.booking.bookingNumber,
    serviceName: r.booking.service.name,
    pincode: r.booking.address.pincode,
    city: r.booking.address.city,
    scheduledAt: r.booking.scheduledAt,
    slotLabel: r.booking.slotLabel,
    priceAmount: r.booking.priceAmount,
    sentAt: r.sentAt,
  }));
}
