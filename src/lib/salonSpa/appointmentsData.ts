/**
 * SalonAppointment — the Salon & Spa module's real bookings. Prisma-backed
 * (`SalonAppointment` table), partner-scoped throughout. `customer` stays a
 * loose display-name string (no dedicated Salon customer catalog exists).
 * `service`/serviceName/durationMinutes/price are copied from the chosen
 * SalonService at booking/reschedule time — see servicesData.ts's doc
 * comment for why that's denormalized rather than always joined live.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";
import { withRecordLock } from "@/lib/withRecordLock";

export const SALON_APPOINTMENT_STATUSES = ["Booked", "In Progress", "Completed", "Cancelled", "No-show"] as const;
export type SalonAppointmentStatus = (typeof SALON_APPOINTMENT_STATUSES)[number];
const MAX_SALON_SERVICE_DURATION_MINUTES = 24 * 60;

export class SalonScheduleConflictError extends Error {
  constructor(readonly withRecordId: string) {
    super("This stylist already has an appointment during the selected time.");
    this.name = "SalonScheduleConflictError";
  }
}

function validateAppointmentInput(input: { customer: string; stylist: string; appointmentDate: Date; commissionPercent?: number }) {
  if (!input.customer.trim()) throw new Error("Customer name is required.");
  if (!input.stylist.trim()) throw new Error("Stylist / therapist is required.");
  if (!input.appointmentDate || !Number.isFinite(input.appointmentDate.getTime())) throw new Error("Select a valid appointment date and time.");
  if (input.commissionPercent !== undefined && (!Number.isFinite(input.commissionPercent) || input.commissionPercent < 0 || input.commissionPercent > 100)) throw new Error("Commission must be between 0 and 100 percent.");
}

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
  await assertRecordModuleAccess(partnerId, "salon-spa");
  return prisma.salonAppointment.findMany({
    where: { partnerId },
    orderBy: { appointmentDate: "desc" },
  });
}

export async function getSalonAppointment(partnerId: string, id: string): Promise<SalonAppointmentRecord | null> {
  await assertRecordModuleAccess(partnerId, "salon-spa");
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
  await assertRecordModuleAccess(partnerId, "salon-spa");
  if (!stylist || !appointmentDate) return { conflict: false };
  const start = new Date(appointmentDate).getTime();
  if (Number.isNaN(start)) return { conflict: false };
  const duration = durationMinutes || 30;
  if (!Number.isSafeInteger(duration) || duration < 1 || duration > MAX_SALON_SERVICE_DURATION_MINUTES) throw new Error("Appointment duration must be from 1 minute to 24 hours.");
  const end = start + duration * 60_000;

  const candidates = await prisma.salonAppointment.findMany({
    where: {
      partnerId,
      appointmentDate: { gte: new Date(start - MAX_SALON_SERVICE_DURATION_MINUTES * 60_000), lt: new Date(end) },
      status: { notIn: ["Cancelled", "No-show"] },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true, stylist: true, appointmentDate: true, durationMinutes: true },
  });
  for (const c of candidates) {
    if (c.stylist.trim().toLocaleLowerCase("en") !== stylist.trim().toLocaleLowerCase("en")) continue;
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
  await assertRecordModuleAccess(partnerId, "salon-spa");
  await assertPartnerCanWrite(partnerId);
  validateAppointmentInput(input);
  return withRecordLock("salon-stylist", `${partnerId}:${input.stylist.trim().toLocaleLowerCase("en")}`, async () => {
    const service = await prisma.salonService.findFirst({ where: { id: input.serviceId, partnerId, isActive: true } });
    if (!service) throw new Error("Select an active service belonging to this business.");
    if (!Number.isSafeInteger(service.durationMinutes) || service.durationMinutes < 1 || service.durationMinutes > MAX_SALON_SERVICE_DURATION_MINUTES) throw new Error("The selected service has an invalid duration. Update the service before booking.");
    if (!Number.isSafeInteger(service.price) || service.price < 0) throw new Error("The selected service has an invalid price. Update the service before booking.");
    const conflict = await findSalonScheduleConflict(partnerId, input.stylist, input.appointmentDate.toISOString(), service.durationMinutes);
    if (conflict.conflict) throw new SalonScheduleConflictError(conflict.withRecordId);
    return prisma.salonAppointment.create({
      data: {
        partnerId,
        customer: input.customer.trim(),
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        stylist: input.stylist.trim(),
        appointmentDate: input.appointmentDate,
        branch: input.branch?.trim() || null,
        commissionPercent: input.commissionPercent == null ? null : Math.round(input.commissionPercent),
      },
    });
  });
}

export async function updateSalonAppointment(
  partnerId: string,
  id: string,
  input: { customer: string; serviceId: string; stylist: string; appointmentDate: Date; status: string; branch?: string; commissionPercent?: number }
): Promise<void> {
  await assertRecordModuleAccess(partnerId, "salon-spa");
  await assertPartnerCanWrite(partnerId);
  validateAppointmentInput(input);
  if (!SALON_APPOINTMENT_STATUSES.includes(input.status as SalonAppointmentStatus)) throw new Error("Select a valid appointment status.");
  return withRecordLock("salon-stylist", `${partnerId}:${input.stylist.trim().toLocaleLowerCase("en")}`, async () => {
    const existing = await prisma.salonAppointment.findFirst({ where: { id, partnerId } });
    if (!existing) throw new Error("Appointment not found.");
    assertPartnerScope(partnerId, existing.partnerId);
    if (existing.status === "Completed" && input.status !== "Completed") throw new Error("Completed appointments cannot be reopened or edited.");
    if (existing.status !== "Completed" && input.status === "Completed") throw new Error("Use the Complete Appointment action to complete this booking.");
    const service = await prisma.salonService.findFirst({ where: { id: input.serviceId, partnerId } });
    if (!service || (!service.isActive && service.id !== existing.serviceId)) throw new Error("Select an active service belonging to this business.");
    if (!Number.isSafeInteger(service.durationMinutes) || service.durationMinutes < 1 || service.durationMinutes > MAX_SALON_SERVICE_DURATION_MINUTES) throw new Error("The selected service has an invalid duration. Update the service before booking.");
    if (!Number.isSafeInteger(service.price) || service.price < 0) throw new Error("The selected service has an invalid price. Update the service before booking.");
    if (input.status !== "Cancelled" && input.status !== "No-show") {
      const conflict = await findSalonScheduleConflict(partnerId, input.stylist, input.appointmentDate.toISOString(), service.durationMinutes, id);
      if (conflict.conflict) throw new SalonScheduleConflictError(conflict.withRecordId);
    }
    await prisma.salonAppointment.update({
      where: { id },
      data: {
        customer: input.customer.trim(),
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        stylist: input.stylist.trim(),
        appointmentDate: input.appointmentDate,
        status: input.status,
        branch: input.branch?.trim() || null,
        commissionPercent: input.commissionPercent == null ? null : Math.round(input.commissionPercent),
      },
    });
  });
}

export async function completeSalonAppointment(partnerId: string, id: string): Promise<SalonAppointmentRecord> {
  await assertRecordModuleAccess(partnerId, "salon-spa");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("salon-appointment", `${partnerId}:${id}`, async () => {
    const existing = await prisma.salonAppointment.findFirst({ where: { id, partnerId } });
    if (!existing) throw new Error("Appointment not found.");
    assertPartnerScope(partnerId, existing.partnerId);
    if (existing.status === "Cancelled" || existing.status === "No-show") throw new Error("Cancelled or no-show appointments cannot be completed.");
    const commissionAmount = Math.round((existing.price * (existing.commissionPercent ?? 0)) / 100);
    return prisma.salonAppointment.update({
      where: { id },
      data: { status: "Completed", commissionAmount },
    });
  });
}

export async function setSalonAppointmentInvoiceId(partnerId: string, id: string, invoiceId: string): Promise<void> {
  await assertRecordModuleAccess(partnerId, "salon-spa");
  await assertPartnerCanWrite(partnerId);
  const existing = await prisma.salonAppointment.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.salonAppointment.update({ where: { id }, data: { invoiceId } });
}
