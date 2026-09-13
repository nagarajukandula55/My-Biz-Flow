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

/**
 * getModule() (moduleRegistry.ts) calls getModuleAppearance(slug) once per
 * module it resolves, and it's resolved constantly — every page header,
 * every nav item, per-row in analytics' recent-activity list, etc. That
 * used to mean one `findMany`-sized table getting hit with a separate
 * `findUnique` for every single call, all across the app, on nearly every
 * request (a classic N+1 spread across many call sites rather than one
 * loop). This table changes only when a Super Admin edits a module's
 * label/icon in the Designer, so it's cached whole (it's tiny — one row
 * per module) for a short TTL and invalidated immediately on write.
 */
const APPEARANCE_CACHE_TTL_MS = 10_000;
let appearanceCache: { data: Record<string, ModuleAppearance>; expiresAt: number } | null = null;

async function loadAppearances(): Promise<Record<string, ModuleAppearance>> {
  const now = Date.now();
  if (appearanceCache && appearanceCache.expiresAt > now) return appearanceCache.data;

  const rows = await prisma.moduleAppearance.findMany();
  const data: Record<string, ModuleAppearance> = {};
  for (const row of rows) {
    data[row.slug] = { label: row.label ?? undefined, icon: row.icon ?? undefined };
  }
  appearanceCache = { data, expiresAt: now + APPEARANCE_CACHE_TTL_MS };
  return data;
}

export async function getModuleAppearance(slug: string): Promise<ModuleAppearance> {
  const all = await loadAppearances();
  return all[slug] ?? {};
}

export async function getAllModuleAppearances(): Promise<Record<string, ModuleAppearance>> {
  return loadAppearances();
}

export async function setModuleAppearance(slug: string, appearance: ModuleAppearance): Promise<void> {
  await prisma.moduleAppearance.upsert({
    where: { slug },
    create: { slug, label: appearance.label, icon: appearance.icon },
    update: { label: appearance.label, icon: appearance.icon },
  });
  appearanceCache = null;
}
