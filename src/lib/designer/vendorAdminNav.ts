import { buildVendorNavGroups } from "./moduleRegistry";
import type { VendorNavGroup } from "./modules";

/**
 * The full vendor sidebar's nav groups: Common (Dashboard/Analytics) +
 * Vendor Admin (Settings/Numbering/Subscription/Users/Roles/Access Groups)
 * + every module group from buildVendorNavGroups(). Called ONCE from
 * src/app/vendor/[vendorId]/layout.tsx (a shared layout, so this doesn't
 * re-run on every client-side navigation) — active-item highlighting is
 * computed client-side in Sidebar.tsx from the current pathname, not
 * baked in here, since one set of nav groups now serves every page.
 */
export async function buildVendorAdminNavGroups(): Promise<VendorNavGroup[]> {
  const commonGroup: VendorNavGroup = {
    title: "Common",
    items: [
      { key: "dashboard", label: "Dashboard", dot: "neutral", href: "dashboard" },
      { key: "analytics", label: "Analytics", dot: "neutral", href: "analytics" },
    ],
  };
  const vendorAdminGroup: VendorNavGroup = {
    title: "Vendor Admin",
    items: [
      { key: "settings", label: "Settings", dot: "amber", href: "settings" },
      { key: "numbering", label: "Numbering", dot: "amber", href: "settings/numbering" },
      { key: "billing", label: "Subscription", dot: "amber", href: "admin/subscription" },
      { key: "users", label: "Users", dot: "amber", href: "admin/users" },
      { key: "roles", label: "Roles", dot: "amber", href: "admin/roles" },
      { key: "access-groups", label: "Access Groups", dot: "amber", href: "admin/access-groups" },
    ],
  };
  return [commonGroup, vendorAdminGroup, ...(await buildVendorNavGroups())];
}
