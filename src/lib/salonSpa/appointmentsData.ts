/**
 * SalonAppointment — the Salon & Spa module's real bookings. Prisma-backed
 * (`SalonAppointment` table), partner-scoped throughout. `customer` stays a
 * loose display-name string (no dedicated Salon customer catalog exists).
 * `service`/serviceName/durationMinutes/price are copied from the chosen
 * SalonService at booking/reschedule time — see servicesData.ts's doc
 * comment for why that's denormalized rather than always joined live.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export const SALON_APPOINTMENT_STATUSES = ["Booked", "In Progress", "Completed", "Cancelled", "No-show"] as const;
export type SalonAppointmentStatus = (typeof SALON_APPOINTMENT_STATUSES)[number];

export type SalonAppointmentRecord = {
  id: string;
  partnerId: string;
  customer: string;
  serviceId: string | null;
  serviceName: string;
  stylist: string;
  durationMinutes: number;
  price: number;
  status: string;
  appointmentDate: Date;
  branch: string | null;
  commissionPercent: number | null;
  commissionAmount: number | null;
  invoiceId: string | null;
  createdAt: Date;
};

export async function listSalonAppointments(partnerId: string): Promise<SalonAppointmentRecord[]> {
  return prisma.salonAppointment.findMany({
    where: { partnerId },
    orderBy: { appointmentDate: "desc" },
  });
}

export async function getSalonAppointment(partnerId: string, id: string): Promise<SalonAppointmentRecord | null> {
  const row = await prisma.salonAppointment.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

/** Same stylist/therapist overlap-window check the module always had, now querying SalonAppointment instead of BusinessRecord. */
export async function findSalonScheduleConflict(
  partnerId: string,
  stylist: string,
  appointmentDate: string,
  durationMinutes: number,
  excludeId?: string
): Promise<{ conflict: false } | { conflict: true; withRecordId: string }> {
  if (!stylist || !appointmentDate) return { conflict: false };
  const start = new Date(appointmentDate).getTime();
  if (Number.isNaN(start)) return { conflict: false };
  const end = start + (durationMinutes || 30) * 60_000;

  const candidates = await prisma.salonAppointment.findMany({
    where: {
      partnerId,
      stylist,
      status: { notIn: ["Cancelled", "No-show"] },
      id: excludeId ? { not: excludeId } : undefined,
    },
  });
  for (const c of candidates) {
    const oStart = c.appointmentDate.getTime();
    const oEnd = oStart + (c.durationMinutes || 30) * 60_000;
    if (start < oEnd && oStart < end) {
      return { conflict: true, withRecordId: c.id };
    }
  }
  return { conflict: false };
}

export async function createSalonAppointment(
  partnerId: string,
  input: { customer: string; serviceId: string; stylist: string; appointmentDate: Date; branch?: string; commissionPercent?: number }
): Promise<SalonAppointmentRecord> {
  const service = await prisma.salonService.findUniqueOrThrow({ where: { id: input.serviceId } });
  assertPartnerScope(partnerId, service.partnerId);
  return prisma.salonAppointment.create({
    data: {
      partnerId,
      customer: input.customer,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      stylist: input.stylist,
      appointmentDate: input.appointmentDate,
      branch: input.branch || null,
      commissionPercent: input.commissionPercent ?? null,
    },
  });
}

export async function updateSalonAppointment(
  partnerId: string,
  id: string,
  input: { customer: string; serviceId: string; stylist: string; appointmentDate: Date; status: string; branch?: string; commissionPercent?: number }
): Promise<void> {
  const existing = await prisma.salonAppointment.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  const service = await prisma.salonService.findUniqueOrThrow({ where: { id: input.serviceId } });
  assertPartnerScope(partnerId, service.partnerId);
  await prisma.salonAppointment.update({
    where: { id },
    data: {
      customer: input.customer,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      stylist: input.stylist,
      appointmentDate: input.appointmentDate,
      status: input.status,
      branch: input.branch || null,
      commissionPercent: input.commissionPercent ?? null,
    },
  });
}

export async function completeSalonAppointment(partnerId: string, id: string): Promise<SalonAppointmentRecord> {
  const existing = await prisma.salonAppointment.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  const commissionAmount = Math.round((existing.price * (existing.commissionPercent ?? 0)) / 100);
  return prisma.salonAppointment.update({
    where: { id },
    data: { status: "Completed", commissionAmount },
  });
}

export async function setSalonAppointmentInvoiceId(partnerId: string, id: string, invoiceId: string): Promise<void> {
  const existing = await prisma.salonAppointment.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.salonAppointment.update({ where: { id }, data: { invoiceId } });
}
