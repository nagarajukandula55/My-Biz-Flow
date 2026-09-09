/**
 * The Service catalog — both what Providers pick from during onboarding and
 * the customer-facing booking catalog (pricing/duration drive Booking's
 * priceAmount). Prisma-backed (`Service` table). Ops-editable from
 * field-force/admin (add/edit/price/deactivate) so new categories/services
 * or price changes don't need a schema change; see
 * src/lib/sample-data/field-force-services.ts for the starter multi-category
 * catalog this seeds itself with the first time the table is read empty.
 */
import { prisma } from "@/lib/prisma";
import { STARTER_SERVICES } from "@/lib/sample-data/field-force-services";

export type ServiceRecord = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  priceType: string;
  basePrice: number;
  durationMinutes: number;
  minSkillLevel: string;
  isActive: boolean;
};

export async function ensureServiceCatalogSeeded(): Promise<void> {
  const count = await prisma.service.count();
  if (count > 0) return;
  await prisma.service.createMany({
    data: STARTER_SERVICES.map((s) => ({
      name: s.name,
      category: s.category,
      description: s.description,
      priceType: s.priceType,
      basePrice: s.basePrice,
      durationMinutes: s.durationMinutes,
      minSkillLevel: s.minSkillLevel,
    })),
    skipDuplicates: true,
  });
}

export async function listServices(includeInactive = false): Promise<ServiceRecord[]> {
  await ensureServiceCatalogSeeded();
  return prisma.service.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getService(id: string): Promise<ServiceRecord | null> {
  return prisma.service.findUnique({ where: { id } });
}

export async function createService(input: {
  name: string;
  category: string;
  description?: string;
  priceType: "fixed" | "hourly";
  basePrice: number;
  durationMinutes: number;
  minSkillLevel: "unskilled" | "skilled";
}): Promise<ServiceRecord> {
  return prisma.service.create({
    data: {
      name: input.name,
      category: input.category,
      description: input.description || null,
      priceType: input.priceType,
      basePrice: input.basePrice,
      durationMinutes: input.durationMinutes,
      minSkillLevel: input.minSkillLevel,
    },
  });
}

export async function updateServicePricing(
  id: string,
  input: { priceType: "fixed" | "hourly"; basePrice: number; durationMinutes: number; minSkillLevel: "unskilled" | "skilled"; description?: string }
): Promise<void> {
  await prisma.service.update({
    where: { id },
    data: {
      priceType: input.priceType,
      basePrice: input.basePrice,
      durationMinutes: input.durationMinutes,
      minSkillLevel: input.minSkillLevel,
      description: input.description || null,
    },
  });
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  await prisma.service.update({ where: { id }, data: { isActive } });
}
