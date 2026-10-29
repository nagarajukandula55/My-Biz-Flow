import { withRecordLock } from "@/lib/withRecordLock";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { requireBookingWindow, requirePaise } from "@/lib/bookingValidation";
import { afterDatabaseCommit } from "@/lib/databaseTransaction";
/**
 * Data-access layer for the Event Booking module's Prisma-backed tables
 * (Venue, EventBooking, EventResource, EventResourceAllocation — see
 * prisma/schema.prisma's "Event Booking" block). Replaces the previous
 * BusinessRecord-backed storage for the main booking record; Venue and
 * EventResource were never BusinessRecord-backed (brand-new tables).
 *
 * Money fields (EventBooking.totalAmount/amountPaid) are Int paise in the
 * DB, same convention as every other money field in this schema — every
 * function here that takes/returns an amount in RUPEES (for UI convenience)
 * says so explicitly in its name/comment; everything else is paise.
 */
import { prisma } from "@/lib/prisma";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import { eventBookingConfirmedMessage, eventPaymentReceivedMessage } from "@/lib/telegramTemplates";
import { createBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";

import { EVENT_BOOKING_STATUSES, type EventBookingStatus, type EventBookingType } from "@/lib/eventBookingTypes";
export { EVENT_BOOKING_STATUSES, type EventBookingStatus, type EventBookingType } from "@/lib/eventBookingTypes";

export async function sendUpcomingEventReminders(partnerId: string, now = new Date()): Promise<number> {
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const bookings = await listEventBookingsInRange(partnerId, now, end);
  const sent = await listBusinessRecords(partnerId, "event-starting-reminder");
  let delivered = 0;
  for (const booking of bookings.filter(item => item.status !== "Cancelled")) {
    const key = `${booking.id}:${booking.startAt.toISOString().slice(0, 13)}`;
    if (sent.some(row => String(row.reminderKey) === key)) continue;
    const ok = await sendPartnerTelegramAlert(partnerId, "eventStartingSoon", `Event starting soon: ${booking.eventName} at ${booking.startAt.toISOString()}`);
    if (ok) { await createBusinessRecord(partnerId, "event-starting-reminder", { reminderKey: key, bookingId: booking.id, sentAt: new Date().toISOString(), status: "Delivered" }); delivered++; }
  }
  return delivered;
}

// --- Venues ---------------------------------------------------------------

export async function listVenues(partnerId: string) {
  return prisma.venue.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getVenue(partnerId: string, id: string) {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue || venue.partnerId !== partnerId) return null;
  return venue;
}

export async function createVenue(partnerId: string, data: { name: string; address?: string; capacity?: number }) {
  return prisma.venue.create({
    data: { partnerId, name: data.name, address: data.address || null, capacity: data.capacity ?? null },
  });
}

export async function updateVenue(
  partnerId: string,
  id: string,
  data: { name: string; address?: string; capacity?: number; isActive?: boolean }
) {
  const existing = await getVenue(partnerId, id);
  if (!existing) throw new Error("Venue not found.");
  return prisma.venue.update({
    where: { id },
    data: { name: data.name, address: data.address || null, capacity: data.capacity ?? null, isActive: data.isActive ?? existing.isActive },
  });
}

// --- Event resources -------------------------------------------------------

export async function listEventResources(partnerId: string) {
  return prisma.eventResource.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getEventResource(partnerId: string, id: string) {
  const resource = await prisma.eventResource.findUnique({ where: { id } });
  if (!resource || resource.partnerId !== partnerId) return null;
  return resource;
}

export async function createEventResource(partnerId: string, data: { name: string; category?: string }) {
  return prisma.eventResource.create({ data: { partnerId, name: data.name, category: data.category || null } });
}

export async function updateEventResource(
  partnerId: string,
  id: string,
  data: { name: string; category?: string; isActive?: boolean }
) {
  const existing = await getEventResource(partnerId, id);
  if (!existing) throw new Error("Resource not found.");
  return prisma.eventResource.update({
    where: { id },
    data: { name: data.name, category: data.category || null, isActive: data.isActive ?? existing.isActive },
  });
}

// --- Bookings ---------------------------------------------------------------

export async function listEventBookings(partnerId: string) {
  return prisma.eventBooking.findMany({
    where: { partnerId },
    orderBy: { startAt: "desc" },
    include: { venue: true },
  });
}

export async function listEventBookingsInRange(partnerId: string, rangeStart: Date, rangeEnd: Date) {
  return prisma.eventBooking.findMany({
    where: {
      partnerId,
      // A booking is "in range" if its own span overlaps the requested
      // window at all — same overlap test as the double-booking check below.
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    },
    orderBy: { startAt: "asc" },
    include: { venue: true },
  });
}

export async function getEventBooking(partnerId: string, id: string) {
  const booking = await prisma.eventBooking.findUnique({
    where: { id },
    include: { venue: true, resourceAllocations: { include: { resource: true } } },
  });
  if (!booking || booking.partnerId !== partnerId) return null;
  return booking;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type ResourceAllocationInput = { resourceId: string; quantity: number };

export type ResourceConflict = { resourceId: string; resourceName: string; conflictingBookingId: string; conflictingEventName: string };

/**
 * Fail-closed double-booking check: does any OTHER non-Cancelled booking for
 * this partner already allocate one of `allocations`' resources during an
 * overlapping [startAt, endAt) window? Mirrors the stock-check pattern used
 * elsewhere in this app (e.g. deductInventoryForWorkorderAction) — checked
 * server-side before the write, never trusted from the client.
 * `excludeBookingId` lets an edit re-check without flagging itself.
 */
export async function checkResourceConflicts(
  partnerId: string,
  startAt: Date,
  endAt: Date,
  allocations: ResourceAllocationInput[],
  excludeBookingId?: string
): Promise<ResourceConflict[]> {
  const resourceIds = allocations.map((a) => a.resourceId).filter(Boolean);
  if (resourceIds.length === 0) return [];

  const candidateAllocations = await prisma.eventResourceAllocation.findMany({
    where: {
      resourceId: { in: resourceIds },
      eventBooking: {
        partnerId,
        status: { not: "Cancelled" },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    },
    include: { eventBooking: true, resource: true },
  });

  const conflicts: ResourceConflict[] = [];
  for (const alloc of candidateAllocations) {
    const booking = alloc.eventBooking;
    if (!rangesOverlap(startAt, endAt, booking.startAt, booking.endAt)) continue;
    conflicts.push({
      resourceId: alloc.resourceId,
      resourceName: alloc.resource.name,
      conflictingBookingId: booking.id,
      conflictingEventName: booking.eventName,
    });
  }
  return conflicts;
}

export type CreateEventBookingInput = {
  venueId?: string | null;
  eventName: string;
  bookingType: EventBookingType;
  startAt: Date;
  endAt: Date;
  customerName: string;
  customerContact?: string;
  status?: EventBookingStatus;
  totalAmount: number; // paise
  amountPaid?: number; // paise
  allocations: ResourceAllocationInput[];
};

async function validateEvent(partnerId: string, input: CreateEventBookingInput): Promise<ResourceAllocationInput[]> {
  requireBookingWindow(input.startAt, input.endAt);
  requirePaise(input.totalAmount);
  if (input.amountPaid !== undefined) requirePaise(input.amountPaid);
  if (input.status && !EVENT_BOOKING_STATUSES.includes(input.status)) throw new Error("Invalid booking status.");
  if (!['OneTime', 'Recurring'].includes(input.bookingType)) throw new Error("Invalid booking type.");
  if (input.venueId && !await prisma.venue.findFirst({ where: { id: input.venueId, partnerId }, select: { id: true } })) throw new Error("Venue not found.");
  const allocations = input.allocations.filter(a => a.resourceId);
  if (allocations.some(a => !Number.isSafeInteger(a.quantity) || a.quantity <= 0 || a.quantity > 2147483647)) throw new Error("Resource quantity must be a positive whole number.");
  const ids = allocations.map(a => a.resourceId);
  if (new Set(ids).size !== ids.length) throw new Error("Select each resource only once.");
  if (ids.length && await prisma.eventResource.count({ where: { partnerId, id: { in: ids } } }) !== ids.length) throw new Error("Resource not found.");
  return allocations;
}

async function bookingConflicts(partnerId: string, input: Pick<CreateEventBookingInput, 'venueId' | 'startAt' | 'endAt'>, allocations: ResourceAllocationInput[], excludeId?: string): Promise<ResourceConflict[]> {
  const conflicts = await checkResourceConflicts(partnerId, input.startAt, input.endAt, allocations, excludeId);
  if (input.venueId) {
    const booking = await prisma.eventBooking.findFirst({ where: { partnerId, venueId: input.venueId, status: { not: 'Cancelled' }, startAt: { lt: input.endAt }, endAt: { gt: input.startAt }, ...(excludeId ? { id: { not: excludeId } } : {}) }, include: { venue: true } });
    if (booking) conflicts.push({ resourceId: `venue:${input.venueId}`, resourceName: booking.venue?.name ?? 'Venue', conflictingBookingId: booking.id, conflictingEventName: booking.eventName });
  }
  return conflicts;
}

/**
 * Creates an EventBooking plus its EventResourceAllocation rows, after a
 * fail-closed conflict check (block on conflict — same posture as this
 * app's other resource-availability checks, e.g. Field Force venue overlap).
 */
export async function createEventBooking(
  partnerId: string,
  input: CreateEventBookingInput
): Promise<{ ok: true; id: string } | { ok: false; conflicts: ResourceConflict[] }> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("event-bookings", partnerId, async () => {
    const allocations = await validateEvent(partnerId, input);
    const conflicts = input.status === "Cancelled" ? [] : await bookingConflicts(partnerId, input, allocations);
    if (conflicts.length > 0) return { ok: false, conflicts };

    const booking = await prisma.eventBooking.create({
      data: {
        partnerId,
        venueId: input.venueId || null,
        eventName: input.eventName,
        bookingType: input.bookingType,
        startAt: input.startAt,
        endAt: input.endAt,
        customerName: input.customerName,
        customerContact: input.customerContact || null,
        status: input.status ?? "Requested",
        totalAmount: input.totalAmount,
        amountPaid: input.amountPaid ?? 0,
        resourceAllocations: {
          create: allocations.map((a) => ({ resourceId: a.resourceId, quantity: a.quantity })),
        },
      },
    });
    return { ok: true, id: booking.id };
  });
}

export type UpdateEventBookingInput = CreateEventBookingInput;

export async function updateEventBooking(
  partnerId: string,
  id: string,
  input: UpdateEventBookingInput
): Promise<{ ok: true } | { ok: false; conflicts: ResourceConflict[]; message?: string }> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("event-bookings", partnerId, async () => {
    const existing = await getEventBooking(partnerId, id);
    if (!existing) return { ok: false, conflicts: [], message: "Booking not found." };

    const allocations = await validateEvent(partnerId, input);
    const conflicts = (input.status ?? existing.status) === "Cancelled" ? [] : await bookingConflicts(partnerId, input, allocations, id);
    if (conflicts.length > 0) return { ok: false, conflicts };

    const wasStatus = existing.status;
    const wasAmountPaid = existing.amountPaid;

    await prisma.$transaction([
      prisma.eventResourceAllocation.deleteMany({ where: { eventBookingId: id } }),
      prisma.eventBooking.update({
        where: { id },
        data: {
          venueId: input.venueId || null,
          eventName: input.eventName,
          bookingType: input.bookingType,
          startAt: input.startAt,
          endAt: input.endAt,
          customerName: input.customerName,
          customerContact: input.customerContact || null,
          status: input.status ?? existing.status,
          totalAmount: input.totalAmount,
          amountPaid: input.amountPaid ?? existing.amountPaid,
          resourceAllocations: { create: allocations.map((a) => ({ resourceId: a.resourceId, quantity: a.quantity })) },
        },
      }),
    ]);

    await maybeSendLifecycleAlerts(partnerId, id, {
      eventName: input.eventName,
      prevStatus: wasStatus,
      nextStatus: input.status ?? existing.status,
      prevAmountPaid: wasAmountPaid,
      nextAmountPaid: input.amountPaid ?? existing.amountPaid,
    });

    return { ok: true };
  });
}

/** Standalone status transition (used by the detail page's quick-action
 * buttons, distinct from the full edit form) — still goes through the same
 * alert hook as a full edit. */
export async function setEventBookingStatus(partnerId: string, id: string, status: EventBookingStatus): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("event-bookings", partnerId, async () => {
    const existing = await getEventBooking(partnerId, id);
    if (!existing) throw new Error("Booking not found.");
    if (!EVENT_BOOKING_STATUSES.includes(status)) throw new Error("Invalid booking status.");
    if (status !== "Cancelled" && (await bookingConflicts(partnerId, existing, existing.resourceAllocations, id)).length) throw new Error("Venue or resources are already booked in this time window.");
    await prisma.eventBooking.update({ where: { id }, data: { status } });
    await maybeSendLifecycleAlerts(partnerId, id, {
      eventName: existing.eventName,
      prevStatus: existing.status,
      nextStatus: status,
      prevAmountPaid: existing.amountPaid,
      nextAmountPaid: existing.amountPaid,
    });
  });
}

/** Records an additional payment (rupees, converted to paise here) against
 * a booking's amountPaid, then fires the paymentReceived alert if it
 * actually increased. */
export async function recordEventBookingPayment(partnerId: string, id: string, additionalAmountRupees: number): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("event-bookings", partnerId, async () => {
    if (!Number.isFinite(additionalAmountRupees) || Math.round(additionalAmountRupees * 100) <= 0) throw new Error("Payment amount must be greater than zero.");
    const existing = await getEventBooking(partnerId, id);
    if (!existing) throw new Error("Booking not found.");
    const nextAmountPaid = existing.amountPaid + Math.round(additionalAmountRupees * 100);
    requirePaise(nextAmountPaid);
    await prisma.eventBooking.update({ where: { id }, data: { amountPaid: nextAmountPaid } });
    await maybeSendLifecycleAlerts(partnerId, id, {
      eventName: existing.eventName,
      prevStatus: existing.status,
      nextStatus: existing.status,
      prevAmountPaid: existing.amountPaid,
      nextAmountPaid,
    });
  });
}

export async function deleteEventBooking(partnerId: string, id: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("event-bookings", partnerId, async () => {
    const existing = await getEventBooking(partnerId, id);
    if (!existing) return;
    await prisma.$transaction([
      prisma.eventResourceAllocation.deleteMany({ where: { eventBookingId: id } }),
      prisma.eventBooking.delete({ where: { id } }),
    ]);
  });
}

function formatPaise(paise: number): string {
  return `Rs ${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Fires the two wired Telegram alert occasions ("eventBookingConfirmed",
 * "eventPaymentReceived" — see TELEGRAM_ALERT_TYPES in src/lib/telegram.ts)
 * on an actual state transition, never on every save. "eventStartingSoon" is
 * NOT fired from here — it needs a scheduled/cron job to check upcoming
 * startAt times, which is out of scope for this pass (see the type-key note
 * in telegram.ts); only its alert-type key exists so a future cron can use
 * it without another schema/registration change.
 */
async function maybeSendLifecycleAlerts(
  partnerId: string,
  bookingId: string,
  change: { eventName: string; prevStatus: string; nextStatus: string; prevAmountPaid: number; nextAmountPaid: number }
): Promise<void> {
  return afterDatabaseCommit(async () => {
  if (change.prevStatus !== "Confirmed" && change.nextStatus === "Confirmed") {
    const partner = await getPartner(partnerId);
    if (partner) {
      const message = await eventBookingConfirmedMessage({
        partnerBusinessName: partner.businessName,
        eventName: change.eventName,
        bookingId,
      });
      await sendPartnerTelegramAlert(partnerId, "eventBookingConfirmed", message);
    }
  }
  if (change.nextAmountPaid > change.prevAmountPaid) {
    const delta = change.nextAmountPaid - change.prevAmountPaid;
    const partner = await getPartner(partnerId);
    if (partner) {
      const message = await eventPaymentReceivedMessage({
        partnerBusinessName: partner.businessName,
        eventName: change.eventName,
        bookingId,
        amount: formatPaise(delta),
        totalPaid: formatPaise(change.nextAmountPaid),
      });
      await sendPartnerTelegramAlert(partnerId, "eventPaymentReceived", message);
    }
  }
  });
}
