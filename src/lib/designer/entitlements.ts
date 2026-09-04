/**
 * Single source of truth for "what does this partner actually see" on the
 * shared platform pages (dashboard/settings/analytics/profile — the
 * moduleSlug: "platform" pages under src/app/partner/[partnerId]/). Every
 * one of those pages calls getVisibleModules() instead of writing its own
 * entitlement check, so they can never drift from each other.
 *
 * A module shows up here only if BOTH are true:
 *  - it's nominally enabled for the partner (today: getDemoEnabledModules,
 *    the documented stand-in until a real per-partner enabled-modules
 *    record exists)
 *  - the partner holds an ACTIVE ModuleAccessKey for it (src/lib/designer/accessKeys.ts)
 */

import { getDemoEnabledModules, type ModuleDefinition } from "@/lib/designer/modules";
import { getModule } from "@/lib/designer/moduleRegistry";
import { getPartnerEntitlements } from "@/lib/designer/accessKeys";

/** Module slugs this partner is both enabled for AND holds an active access key for. */
export async function getVisibleModuleSlugs(partnerId: string): Promise<string[]> {
  const enabled = getDemoEnabledModules(partnerId);
  const keyed = new Set(await getPartnerEntitlements(partnerId));
  return enabled.filter((slug) => keyed.has(slug));
}

export async function getVisibleModules(partnerId: string): Promise<ModuleDefinition[]> {
  const slugs = await getVisibleModuleSlugs(partnerId);
  const modules = await Promise.all(slugs.map((slug) => getModule(slug)));
  return modules.filter((m): m is ModuleDefinition => Boolean(m));
}
