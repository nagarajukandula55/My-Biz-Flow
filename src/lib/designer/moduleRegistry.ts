/**
 * Server-only layer on top of modules.ts's pure data: applies any
 * Super-Admin-set label/icon override (moduleAppearance.ts, Prisma-backed)
 * to getModule() and buildPartnerNavGroups(). Split into its own file
 * because modules.ts is imported by a Client Component (partner settings'
 * module toggle grid) and must stay free of server-only imports — see
 * modules.ts's header and DESIGN_SYSTEM.md §8 for the pattern this
 * follows.
 *
 * Same function names/signatures as modules.ts's pure versions (now
 * async, since moduleAppearance.ts's Prisma reads are async) — Server
 * Components that want overrides applied just point their import at this
 * file instead of "./modules" and await the calls.
 */

import {
  MODULES,
  MODULE_SUB_NAV,
  type ModuleDefinition,
  type ModuleTaxonomy,
  type PartnerNavGroup,
  taxonomyToNavDot,
} from "./modules";
import { getModuleAppearance, getAllModuleAppearances } from "./moduleAppearance";

export async function getModule(slug: string): Promise<ModuleDefinition | undefined> {
  const base = MODULES.find((m) => m.slug === slug);
  if (!base) return undefined;
  const override = await getModuleAppearance(slug);
  return {
    ...base,
    label: override.label || base.label,
    icon: override.icon,
  };
}

/**
 * @param visibleSlugs When given, only these module slugs are included —
 * used to scope the real partner sidebar to what that partner is actually
 * entitled to (see src/lib/designer/entitlements.ts) instead of every
 * module on the platform. Omitted entirely (undefined) means "show every
 * module," which is what the Super Admin Designer's own module list needs.
 */
export async function buildPartnerNavGroups(visibleSlugs?: string[]): Promise<PartnerNavGroup[]> {
  const allowed = visibleSlugs ? new Set(visibleSlugs) : undefined;
  const groups: Record<ModuleTaxonomy, ModuleDefinition[]> = {
    brand: [],
    vertical: [],
    "cross-cutting": [],
  };
  for (const m of MODULES) {
    if (allowed && !allowed.has(m.slug)) continue;
    groups[m.taxonomy].push(m);
  }

  const appearances = await getAllModuleAppearances();

  const toItems = (mods: ModuleDefinition[]) =>
    mods.map((m) => {
      const override = appearances[m.slug];
      return {
        key: m.slug,
        label: override?.label || m.label,
        dot: taxonomyToNavDot(m.taxonomy),
        icon: override?.icon,
        href: m.slug,
        subItems: MODULE_SUB_NAV[m.slug] ?? [
          { key: `${m.slug}.list`, label: "All records", href: m.slug },
          { key: `${m.slug}.new`, label: "+ New", href: `${m.slug}/new` },
          { key: `${m.slug}.admin`, label: "Admin", href: `${m.slug}/admin` },
        ],
      };
    });

  return [
    { title: "Brand", items: toItems(groups.brand) },
    // Was "Modules" — every nav item here already IS a module, so the old
    // title said nothing about what's actually in the group (which business
    // type this partner runs: POS, Service Centre, Clinic, etc).
    { title: "Business Modules", items: toItems(groups.vertical) },
    // Was "Cross-cutting" — internal engineering jargon (taxonomy name
    // leaking into partner-facing UI). These are the add-ons that work
    // alongside whichever business module(s) above are active (Inventory,
    // Accounting/GST, Loyalty & Rewards, HRMS, Marketplace, Field Force),
    // which "Shared Tools" actually describes.
    { title: "Shared Tools", items: toItems(groups["cross-cutting"]) },
  ].filter((group) => group.items.length > 0);
}
