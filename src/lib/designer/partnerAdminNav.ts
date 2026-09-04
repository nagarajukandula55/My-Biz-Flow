import { buildPartnerNavGroups } from "./moduleRegistry";
import type { PartnerNavGroup } from "./modules";

/**
 * The full partner sidebar's nav groups: Common (Dashboard/Analytics) +
 * Partner Admin (Settings/Numbering/Subscription/Users) + every module
 * group from buildPartnerNavGroups(). Roles and Access Groups moved to
 * the Super Admin panel (src/app/admin/(protected)/roles,
 * .../access-groups) — defined once there, reused across every partner.
 * Called ONCE from
 * src/app/partner/[partnerId]/layout.tsx (a shared layout, so this doesn't
 * re-run on every client-side navigation) — active-item highlighting is
 * computed client-side in Sidebar.tsx from the current pathname, not
 * baked in here, since one set of nav groups now serves every page.
 */
export async function buildPartnerAdminNavGroups(): Promise<PartnerNavGroup[]> {
  const commonGroup: PartnerNavGroup = {
    title: "Common",
    items: [
      { key: "dashboard", label: "Dashboard", dot: "neutral", href: "dashboard" },
      { key: "analytics", label: "Analytics", dot: "neutral", href: "analytics" },
    ],
  };
  const partnerAdminGroup: PartnerNavGroup = {
    title: "Partner Admin",
    items: [
      { key: "settings", label: "Settings", dot: "amber", href: "settings" },
      { key: "numbering", label: "Numbering", dot: "amber", href: "settings/numbering" },
      { key: "billing", label: "Subscription", dot: "amber", href: "admin/subscription" },
      { key: "users", label: "Users", dot: "amber", href: "admin/users" },
    ],
  };
  return [commonGroup, partnerAdminGroup, ...(await buildPartnerNavGroups())];
}
