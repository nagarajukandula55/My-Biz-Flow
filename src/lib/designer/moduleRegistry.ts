/**
 * Server-only layer on top of modules.ts's pure data: applies any
 * Super-Admin-set label/icon override (moduleAppearance.ts, fs-backed) to
 * getModule() and buildVendorNavGroups(). Split into its own file because
 * modules.ts is imported by a Client Component (vendor settings' module
 * toggle grid) and must stay free of node:fs — see modules.ts's header
 * and DESIGN_SYSTEM.md §8 for the pattern this follows.
 *
 * Same function names/signatures as modules.ts's pure versions — Server
 * Components that want overrides applied just point their import at this
 * file instead of "./modules".
 */

import {
  MODULES,
  type ModuleDefinition,
  type ModuleTaxonomy,
  type VendorNavGroup,
  taxonomyToNavDot,
} from "./modules";
import { getModuleAppearance, getAllModuleAppearances } from "./moduleAppearance";

export function getModule(slug: string): ModuleDefinition | undefined {
  const base = MODULES.find((m) => m.slug === slug);
  if (!base) return undefined;
  const override = getModuleAppearance(slug);
  return {
    ...base,
    label: override.label || base.label,
    icon: override.icon,
  };
}

export function buildVendorNavGroups(activeModuleSlug?: string): VendorNavGroup[] {
  const groups: Record<ModuleTaxonomy, ModuleDefinition[]> = {
    brand: [],
    vertical: [],
    "cross-cutting": [],
  };
  for (const m of MODULES) groups[m.taxonomy].push(m);

  const appearances = getAllModuleAppearances();

  const toItems = (mods: ModuleDefinition[]) =>
    mods.map((m) => {
      const override = appearances[m.slug];
      return {
        key: m.slug,
        label: override?.label || m.label,
        dot: taxonomyToNavDot(m.taxonomy),
        icon: override?.icon,
        active: m.slug === activeModuleSlug,
      };
    });

  return [
    { title: "Brand", items: toItems(groups.brand) },
    { title: "Modules", items: toItems(groups.vertical) },
    { title: "Cross-cutting", items: toItems(groups["cross-cutting"]) },
  ];
}
