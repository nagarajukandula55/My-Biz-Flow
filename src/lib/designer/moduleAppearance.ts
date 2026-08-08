/**
 * Super Admin overrides for a module's display label and sidebar icon.
 * Backed by the `ModuleAppearance` Prisma table (see prisma/schema.prisma).
 * Was a JSON-file store; migrated to Postgres with the same function
 * names/behavior, now async to match Prisma's I/O.
 *
 * Keyed by module slug (not pageId) — a module's label/icon is shared
 * across every one of its pages (list/create/edit/detail/admin all show
 * the same sidebar entry and topbar title), so this lives one level up
 * from the per-page customization store.
 */

import { prisma } from "@/lib/prisma";

export type ModuleAppearance = {
  label?: string;
  icon?: string; // key into src/lib/designer/icons.ts's ICONS map
};

export async function getModuleAppearance(slug: string): Promise<ModuleAppearance> {
  const row = await prisma.moduleAppearance.findUnique({ where: { slug } });
  if (!row) return {};
  return { label: row.label ?? undefined, icon: row.icon ?? undefined };
}

export async function getAllModuleAppearances(): Promise<Record<string, ModuleAppearance>> {
  const rows = await prisma.moduleAppearance.findMany();
  const out: Record<string, ModuleAppearance> = {};
  for (const row of rows) {
    out[row.slug] = { label: row.label ?? undefined, icon: row.icon ?? undefined };
  }
  return out;
}

export async function setModuleAppearance(slug: string, appearance: ModuleAppearance): Promise<void> {
  await prisma.moduleAppearance.upsert({
    where: { slug },
    create: { slug, label: appearance.label, icon: appearance.icon },
    update: { label: appearance.label, icon: appearance.icon },
  });
}
