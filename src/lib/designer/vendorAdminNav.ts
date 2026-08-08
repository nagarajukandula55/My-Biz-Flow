import { buildVendorNavGroups, type VendorNavGroup } from "./modules";

/**
 * Nav groups for vendor-ACCOUNT-level admin pages (Users, Roles, Access
 * Groups, Settings, Billing) — these configure the vendor account itself,
 * not a single module, so they get their own "Vendor Admin" group prepended
 * ahead of the regular module groups built from MODULES.
 */
export function buildVendorAdminNavGroups(activeKey?: string): VendorNavGroup[] {
  const commonGroup: VendorNavGroup = {
    title: "Common",
    items: [
      { key: "dashboard", label: "Dashboard", dot: "neutral", active: activeKey === "dashboard" },
      { key: "analytics", label: "Analytics", dot: "neutral", active: activeKey === "analytics" },
    ],
  };
  const vendorAdminGroup: VendorNavGroup = {
    title: "Vendor Admin",
    items: [
      { key: "settings", label: "Settings", dot: "amber", active: activeKey === "settings" },
      { key: "numbering", label: "Numbering", dot: "amber", active: activeKey === "numbering" },
      { key: "billing", label: "Subscription", dot: "amber", active: activeKey === "billing" },
      { key: "users", label: "Users", dot: "amber", active: activeKey === "users" },
      { key: "roles", label: "Roles", dot: "amber", active: activeKey === "roles" },
      { key: "access-groups", label: "Access Groups", dot: "amber", active: activeKey === "access-groups" },
    ],
  };
  return [commonGroup, vendorAdminGroup, ...buildVendorNavGroups()];
}
