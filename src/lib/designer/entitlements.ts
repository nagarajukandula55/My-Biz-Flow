/**
 * Single source of truth for "what does this partner actually see" on the
 * shared platform pages (dashboard/settings/analytics/profile — the
 * moduleSlug: "platform" pages under src/app/partner/[partnerId]/) AND the
 * partner sidebar nav (src/lib/designer/partnerAdminNav.ts). Every one of
 * those pages calls getVisibleModules()/getVisibleModuleSlugs() instead of
 * writing its own entitlement check, so they can never drift from each
 * other or from the sidebar.
 *
 * A module shows up here only if BOTH are true:
 *  - it's in the partner's real PartnerType.defaultModules (not a demo
 *    stand-in — a real Partner -> PartnerType lookup)
 *  - the partner holds an ACTIVE ModuleAccessKey for it (src/lib/designer/accessKeys.ts) —
 *    auto-issued for every default module at signup (see
 *    issueDefaultModuleAccessKeys in src/lib/partnerData.ts), so this is
 *    never empty for a partner created through normal signup; Super Admin
 *    can still revoke/extend individual keys afterward from
 *    /admin/access-keys without this ever drifting from what the sidebar
 *    actually shows.
 */

import { cache } from "react";
import { type ModuleDefinition } from "@/lib/designer/modules";
import { getModule } from "@/lib/designer/moduleRegistry";
import { getPartnerEntitlements } from "@/lib/designer/accessKeys";
import { getPartner } from "@/lib/partnerData";
import { getPartnerType } from "@/lib/designer/partnerTypesData";

/** This partner's real PartnerType.defaultModules — empty if the partner or its type can't be found. */
async function getEnabledModuleSlugs(partnerId: string): Promise<string[]> {
  const partner = await getPartner(partnerId);
  if (!partner) return [];
  const partnerType = await getPartnerType(partner.partnerTypeId);
  return partnerType?.defaultModules ?? [];
}

/**
 * Wrapped in React's cache() — the partner layout calls this once (via
 * buildPartnerAdminNavGroups, to scope the sidebar) on EVERY partner page
 * request, and several individual pages (settings, analytics, dashboard)
 * call it again directly for the same partnerId within that same request.
 * Dedup is per-request only, same as getPartner().
 */
export const getVisibleModuleSlugs = cache(async function getVisibleModuleSlugs(partnerId: string): Promise<string[]> {
  const enabled = await getEnabledModuleSlugs(partnerId);
  const keyed = new Set(await getPartnerEntitlements(partnerId));
  return enabled.filter((slug) => keyed.has(slug));
});

export async function getVisibleModules(partnerId: string): Promise<ModuleDefinition[]> {
  const slugs = await getVisibleModuleSlugs(partnerId);
  const modules = await Promise.all(slugs.map((slug) => getModule(slug)));
  return modules.filter((m): m is ModuleDefinition => Boolean(m));
}
