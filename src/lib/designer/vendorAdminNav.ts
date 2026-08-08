import { buildVendorNavGroups } from "./moduleRegistry";
import type { VendorNavGroup } from "./modules";

/**
 * Nav groups for vendor-ACCOUNT-level admin pages (Users, Roles, Access
 * Groups, Settings, Billing) — these configure the vendor account itself,
 * not a single module, so they get their own "Vendor Admin" group prepended
 * ahead of the regular module groups built from MODULES.
 *
 * This is the ONE nav-building function every page in the app should call
 * (module pages included) — it always returns the full sidebar: Common
 * (Dashboard/Analytics) + Vendor Admin (Settings/Numbering/Subscription/
 * Users/Roles/Access Groups) + the module groups from buildVendorNavGroups().
 * `activeAdminKey` highlights a Common/Vendor Admin item; `activeModuleSlug`
 * highlights a module item — a page sets whichever one applies to it, never
 * both.
 */
export async function buildVendorAdminNavGroups(
  activeAdminKey?: string,
  activeModuleSlug?: string
): Promise<VendorNavGroup[]> {
  const commonGroup: VendorNavGroup = {
    title: "Common",
    items: [
      { key: "dashboard", label: "Dashboard", dot: "neutral", href: "dashboard", active: activeAdminKey === "dashboard" },
      { key: "analytics", label: "Analytics", dot: "neutral", href: "analytics", active: activeAdminKey === "analytics" },
    ],
  };
  const vendorAdminGroup: VendorNavGroup = {
    title: "Vendor Admin",
    items: [
      { key: "settings", label: "Settings", dot: "amber", href: "settings", active: activeAdminKey === "settings" },
      { key: "numbering", label: "Numbering", dot: "amber", href: "settings/numbering", active: activeAdminKey === "numbering" },
      { key: "billing", label: "Subscription", dot: "amber", href: "admin/subscription", active: activeAdminKey === "billing" },
      { key: "users", label: "Users", dot: "amber", href: "admin/users", active: activeAdminKey === "users" },
      { key: "roles", label: "Roles", dot: "amber", href: "admin/roles", active: activeAdminKey === "roles" },
      { key: "access-groups", label: "Access Groups", dot: "amber", href: "admin/access-groups", active: activeAdminKey === "access-groups" },
    ],
  };
  return [commonGroup, vendorAdminGroup, ...(await buildVendorNavGroups(activeModuleSlug))];
}
