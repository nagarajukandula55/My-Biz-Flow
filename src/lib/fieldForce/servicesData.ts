/**
 * The Service catalog engineers pick from during onboarding —
 * Prisma-backed (`Service` table). Ops-editable from field-force/admin
 * (add/edit/deactivate) so new categories/services don't need a schema
 * change; see src/lib/sample-data/field-force-services.ts for the starter
 * Electrical + Electronics list this seeds itself with the first time the
 * table is read empty.
 */
import { prisma } from "@/lib/prisma";
import { STARTER_SERVICES } from "@/lib/sample-data/field-force-services";

export type ServiceRecord = {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
};

export async function ensureServiceCatalogSeeded(): Promise<void> {
  const count = await prisma.service.count();
  if (count > 0) return;
  await prisma.service.createMany({
    data: STARTER_SERVICES.map((s) => ({ name: s.name, category: s.category })),
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

export async function createService(name: string, category: string): Promise<ServiceRecord> {
  return prisma.service.create({ data: { name, category } });
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  await prisma.service.update({ where: { id }, data: { isActive } });
}
