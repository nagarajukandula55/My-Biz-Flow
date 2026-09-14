import { buildPartnerNavGroups } from "./moduleRegistry";
import { getVisibleModuleSlugs } from "./entitlements";
import type { PartnerNavGroup } from "./modules";

/**
 * The full partner sidebar's nav groups: Common (Dashboard/Analytics) +
 * Partner Admin (Settings/Numbering/Subscription/Users) + only the module
 * groups this partner is actually entitled to (see
 * src/lib/designer/entitlements.ts's getVisibleModuleSlugs — their
 * PartnerType.defaultModules intersected with their active
 * ModuleAccessKeys), NOT every module on the platform. Roles and Access
 * Groups moved to the Super Admin panel (src/app/admin/(protected)/roles,
 * .../access-groups) — defined once there, reused across every partner.
 * Called ONCE from
 * src/app/partner/[partnerId]/layout.tsx (a shared layout, so this doesn't
 * re-run on every client-side navigation) — active-item highlighting is
 * computed client-side in Sidebar.tsx from the current pathname, not
 * baked in here, since one set of nav groups now serves every page.
 */
export async function buildPartnerAdminNavGroups(partnerId: string): Promise<PartnerNavGroup[]> {
  const commonGroup: PartnerNavGroup = {
    title: "Common",
    items: [
      { key: "dashboard", label: "Dashboard", dot: "neutral", href: "dashboard" },
      { key: "analytics", label: "Analytics", dot: "neutral", href: "analytics" },
    ],
  };
  // Numbering folded into Settings as a tab (Business Profile / Bank
  // Details / Config / Numbering) rather than its own nav-reachable page —
  // see settings/page.tsx.
  // No "Users" nav entry -- this app has only single-login-per-partner (no
  // multi-account/per-staff login), so a Users management page contradicts
  // the model. Removed per explicit direction; the underlying "users"
  // BusinessRecord (the auto-created "Owner" row) stays, since a few
  // assignment pickers elsewhere (Brand/logistics-fleet/AMC-field-service)
  // still read it.
  const partnerAdminGroup: PartnerNavGroup = {
    title: "Partner Admin",
    items: [
      { key: "settings", label: "Settings", dot: "amber", href: "settings" },
      { key: "billing", label: "Subscription", dot: "amber", href: "admin/subscription" },
    ],
  };
  const visibleSlugs = await getVisibleModuleSlugs(partnerId);
  // Partner Admin renders LAST, after every module group — an account/
  // settings section reads better near the bottom of the sidebar, next to
  // Sign out, than pinned right under Common.
  return [commonGroup, ...(await buildPartnerNavGroups(visibleSlugs)), partnerAdminGroup];
}
