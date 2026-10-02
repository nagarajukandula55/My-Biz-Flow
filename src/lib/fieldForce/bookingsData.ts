/**
 * Booking — the core job/order of the Field Force marketplace: a customer's
 * request for one Service, scheduled, priced, dispatched to a Provider,
 * paid, and rated. Partner-scoped throughout (assertPartnerScope applies to
 * every read/write here). Creating a booking here does NOT dispatch it —
 * that's src/lib/fieldForce/matchingEngine.ts's job (kept separate to avoid
 * a circular import, since the matching engine itself calls back into this
 * file to set providerId/status once an offer is accepted).
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { getNextNumber } from "@/lib/designer/numbering";

export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "assigned",
  "en-route",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingRecord = {
  id: string;
  partnerId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  addressId: string;
  addressLine: string;
  addressState: string;
  addressPincode: string;
  serviceId: string;
  serviceName: string;
  providerId: string | null;
  providerName: string | null;
  providerPhone: string | null;
  status: string;
  scheduledAt: Date;
  slotLabel: string;
  priceAmount: number;
  finalPrice: number | null;
  paymentStatus: string;
  notes: string | null;
  platformFeeAmount: number | null;
  customerPayable: number | null;
  providerPayout: number | null;
  ratingValue: number | null;
  ratingComment: string | null;
  closureNotes: string | null;
  closurePhotoUrl: string | null;
  closureLatitude: number | null;
  closureLongitude: number | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const INCLUDE = {
  customer: true,
  address: true,
  service: true,
  provider: true,
} as const;

function toRecord(row: {
  id: string;
  partnerId: string;
  bookingNumber: string;
  customerId: string;
  addressId: string;
  serviceId: string;
  providerId: string | null;
  status: string;
  scheduledAt: Date;
  slotLabel: string;
  priceAmount: number;
  finalPrice: number | null;
  paymentStatus: string;
  notes: string | null;
  platformFeeAmount: number | null;
  customerPayable: number | null;
  providerPayout: number | null;
  ratingValue: number | null;
  ratingComment: string | null;
  closureNotes: string | null;
  closurePhotoUrl: string | null;
  closureLatitude: number | null;
  closureLongitude: number | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { name: string; phone: string };
  address: { line1: string; city: string; state: string; pincode: string };
  service: { name: string };
  provider: { name: string; phone: string } | null;
}): BookingRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    bookingNumber: row.bookingNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    customerPhone: row.customer.phone,
    addressId: row.addressId,
    addressLine: `${row.address.line1}, ${row.address.city}, ${row.address.state} ${row.address.pincode}`,
    addressState: row.address.state,
    addressPincode: row.address.pincode,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    providerId: row.providerId,
    providerName: row.provider?.name ?? null,
    providerPhone: row.provider?.phone ?? null,
    status: row.status,
    scheduledAt: row.scheduledAt,
    slotLabel: row.slotLabel,
    priceAmount: row.priceAmount,
    finalPrice: row.finalPrice,
    paymentStatus: row.paymentStatus,
    notes: row.notes,
    platformFeeAmount: row.platformFeeAmount,
    customerPayable: row.customerPayable,
    providerPayout: row.providerPayout,
    ratingValue: row.ratingValue,
    ratingComment: row.ratingComment,
    closureNotes: row.closureNotes,
    closurePhotoUrl: row.closurePhotoUrl,
    closureLatitude: row.closureLatitude,
    closureLongitude: row.closureLongitude,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listBookingsForPartner(partnerId: string): Promise<BookingRecord[]> {
  const rows = await prisma.booking.findMany({
    where: { partnerId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecord);
}

export async function listBookingsForCustomer(customerId: string, partnerId: string): Promise<BookingRecord[]> {
  const rows = await prisma.booking.findMany({
    where: { customerId, partnerId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecord);
}

/** A Provider's own active jobs (accepted onward) — for their dashboard's status controls. */
export async function listActiveBookingsForProvider(providerId: string, partnerId: string): Promise<BookingRecord[]> {
  const rows = await prisma.booking.findMany({
    where: { providerId, partnerId, status: { notIn: ["requested", "cancelled"] } },
    include: INCLUDE,
    orderBy: { scheduledAt: "asc" },
  });
  return rows.map(toRecord);
}

export async function getBooking(id: string, partnerId: string): Promise<BookingRecord | null> {
  const row = await prisma.booking.findUnique({ where: { id }, include: INCLUDE });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toRecord(row);
}

/** Creates a booking, computing priceAmount from the chosen Service and generating a bookingNumber. */
export async function createBooking(
  partnerId: string,
  input: { customerId: string; addressId: string; serviceId: string; scheduledAt: Date; slotLabel: string; notes?: string }
): Promise<BookingRecord> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } });
  const bookingNumber = await getNextNumber("field-force.booking", partnerId);
  const row = await prisma.booking.create({
    data: {
      partnerId,
      bookingNumber,
      customerId: input.customerId,
      addressId: input.addressId,
      serviceId: input.serviceId,
      priceAmount: service.basePrice,
      scheduledAt: input.scheduledAt,
      slotLabel: input.slotLabel,
      notes: input.notes || null,
    },
    include: INCLUDE,
  });
  return toRecord(row);
}

/**
 * Same creation path as createBooking, for a job that came from a
 * bulk-uploaded company/OEM job file instead of an end customer booking
 * through the app — tags the resulting Booking with companyId. See
 * src/lib/fieldForce/companyImport.ts, the only caller.
 */
export async function createCompanyBooking(
  partnerId: string,
  input: { customerId: string; addressId: string; serviceId: string; companyId: string; scheduledAt: Date; slotLabel: string; notes?: string }
): Promise<BookingRecord> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } });
  const bookingNumber = await getNextNumber("field-force.booking", partnerId);
  const row = await prisma.booking.create({
    data: {
      partnerId,
      bookingNumber,
      customerId: input.customerId,
      addressId: input.addressId,
      serviceId: input.serviceId,
      companyId: input.companyId,
      priceAmount: service.basePrice,
      scheduledAt: input.scheduledAt,
      slotLabel: input.slotLabel,
      notes: input.notes || null,
    },
    include: INCLUDE,
  });
  return toRecord(row);
}

export async function updateBookingDetails(
  id: string,
  partnerId: string,
  input: { scheduledAt?: Date; slotLabel?: string; notes?: string }
): Promise<void> {
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.booking.update({
    where: { id },
    data: {
      scheduledAt: input.scheduledAt,
      slotLabel: input.slotLabel,
      notes: input.notes,
    },
  });
}

export async function updateBookingStatus(id: string, partnerId: string, status: BookingStatus): Promise<void> {
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status } }),
    prisma.jobAllocation.updateMany({ where: { bookingId: id }, data: { status } }),
  ]);
}

/** Same as updateBookingStatus, but also verifies the calling Provider actually owns this booking — the
 * standalone Provider dashboard's own status-advance control (en-route/in-progress/cancelled). "completed" is
 * NOT allowed through here any more — see closeBookingAsProvider, which requires real closure evidence
 * (solution notes, a photo, and device location) instead of a bare status flip. */
export async function updateBookingStatusAsProvider(id: string, providerId: string, partnerId: string, status: BookingStatus): Promise<void> {
  if (status === "completed") {
    throw new Error("Use closeBookingAsProvider to complete a job — it requires closure notes, a photo, and location.");
  }
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  if (existing.providerId !== providerId) throw new Error("This booking is not assigned to you.");
  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status } }),
    prisma.jobAllocation.updateMany({ where: { bookingId: id }, data: { status } }),
  ]);
}

/**
 * Closes a job with real evidence — a Service Centre-style "fix it and
 * prove it" record: solution notes (what was actually done), a photo taken
 * at closure time, and the device's own GPS location at that moment
 * (independent of the photo's EXIF, which many phones strip). This is the
 * ONLY path that can set status "completed" on a Provider-owned booking —
 * see updateBookingStatusAsProvider's guard above.
 */
export async function closeBookingAsProvider(
  id: string,
  providerId: string,
  partnerId: string,
  input: { notes: string; photoDataUrl: string; latitude: number; longitude: number }
): Promise<void> {
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  if (existing.providerId !== providerId) throw new Error("This booking is not assigned to you.");
  if (!input.notes.trim()) throw new Error("Solution notes are required to close a job.");
  if (!input.photoDataUrl) throw new Error("A photo is required to close a job.");

  const status: BookingStatus = "completed";
  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: {
        status,
        closureNotes: input.notes.trim(),
        closurePhotoUrl: input.photoDataUrl,
        closureLatitude: input.latitude,
        closureLongitude: input.longitude,
        closedAt: new Date(),
      },
    }),
    prisma.jobAllocation.updateMany({ where: { bookingId: id }, data: { status } }),
  ]);
}

/** Directly assigns a Provider (manual ops dispatch) — creates the JobAllocation audit row and advances status. */
export async function assignProviderToBooking(bookingId: string, partnerId: string, providerId: string): Promise<void> {
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { providerId, status: "assigned" } }),
    prisma.jobAllocation.create({ data: { partnerId, bookingId, providerId, status: "assigned" } }),
  ]);
}

/** Sets the agreed final price once Customer/Provider settle it by conversation. */
export async function setFinalPrice(bookingId: string, partnerId: string, amount: number): Promise<void> {
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.booking.update({ where: { id: bookingId }, data: { finalPrice: amount } });
}

export async function rateBooking(id: string, partnerId: string, ratingValue: number, ratingComment?: string, customerId?: string): Promise<void> {
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  if (customerId && existing.customerId !== customerId) throw new Error("This booking does not belong to you.");
  const clamped = Math.min(5, Math.max(1, Math.round(ratingValue)));
  await prisma.booking.update({ where: { id }, data: { ratingValue: clamped, ratingComment: ratingComment || null } });
}
