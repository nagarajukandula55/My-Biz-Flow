/**
 * SalonService — the Salon & Spa module's real service catalog (name,
 * duration, price). Prisma-backed (`SalonService` table), partner-scoped.
 * SalonAppointment.serviceId is an optional FK into this table; the
 * appointment also keeps its own denormalized serviceName/durationMinutes/
 * price (copied from the service at booking time) so a later price change
 * or service deactivation never rewrites the history of past bookings.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export type SalonServiceRecord = {
  id: string;
  partnerId: string;
  name: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
};

export async function listSalonServices(partnerId: string, includeInactive = false): Promise<SalonServiceRecord[]> {
  return prisma.salonService.findMany({
    where: includeInactive ? { partnerId } : { partnerId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getSalonService(partnerId: string, id: string): Promise<SalonServiceRecord | null> {
  const row = await prisma.salonService.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createSalonService(
  partnerId: string,
  input: { name: string; durationMinutes: number; price: number }
): Promise<SalonServiceRecord> {
  return prisma.salonService.create({
    data: {
      partnerId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      price: input.price,
    },
  });
}

export async function updateSalonService(
  partnerId: string,
  id: string,
  input: { name: string; durationMinutes: number; price: number; isActive: boolean }
): Promise<void> {
  const existing = await prisma.salonService.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.salonService.update({
    where: { id },
    data: {
      name: input.name,
      durationMinutes: input.durationMinutes,
      price: input.price,
      isActive: input.isActive,
    },
  });
}
