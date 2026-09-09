/**
 * Job allocations — a Provider assigned to a Booking. Partner-scoped on the
 * booking side (assertPartnerScope applies to partnerId here). This is the
 * manual/fallback dispatch path — the automated path is
 * matchingEngine.ts's JobOffer fan-out; both end up calling
 * assignProviderToBooking() in bookingsData.ts.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { assignProviderToBooking, type BookingStatus } from "@/lib/fieldForce/bookingsData";

export type JobAllocationRecord = {
  id: string;
  providerId: string;
  providerName: string;
  partnerId: string;
  bookingId: string;
  bookingNumber: string;
  status: string;
  assignedAt: Date;
  feeAmount: number | null;
  feeStatus: string | null;
};

export async function listAllocationsForPartner(partnerId: string): Promise<JobAllocationRecord[]> {
  const rows = await prisma.jobAllocation.findMany({
    where: { partnerId },
    include: { provider: true, booking: true },
    orderBy: { assignedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    providerId: r.providerId,
    providerName: r.provider.name,
    partnerId: r.partnerId,
    bookingId: r.bookingId,
    bookingNumber: r.booking.bookingNumber,
    status: r.status,
    assignedAt: r.assignedAt,
    feeAmount: r.feeAmount,
    feeStatus: r.feeStatus,
  }));
}

/**
 * Assigns a Provider to a booking. No fee/charge is set here — the
 * platform's commission is computed separately at payment time (see
 * src/lib/fieldForce/commission.ts); feeAmount/feeStatus here stay a
 * separate, still-unused billing stub (see prisma/schema.prisma's
 * JobAllocation model).
 */
export async function allocateProvider(partnerId: string, bookingId: string, providerId: string): Promise<void> {
  await assignProviderToBooking(bookingId, partnerId, providerId);
}

/**
 * Updates status on both the allocation and its parent Booking together —
 * the two are kept in lockstep on the shared BookingStatus vocabulary
 * (requested/confirmed/assigned/en-route/in-progress/completed/cancelled)
 * so the Allocations page and a Booking's own detail page never disagree.
 */
export async function updateAllocationStatus(allocationId: string, partnerId: string, status: BookingStatus): Promise<void> {
  const existing = await prisma.jobAllocation.findUniqueOrThrow({ where: { id: allocationId } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.$transaction([
    prisma.jobAllocation.update({ where: { id: allocationId }, data: { status } }),
    prisma.booking.update({ where: { id: existing.bookingId }, data: { status } }),
  ]);
}
