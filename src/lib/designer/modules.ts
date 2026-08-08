/**
 * Canonical module registry — the single source of truth for every module
 * type in My Biz Flow. A Vendor's "type" is just the set of module slugs
 * enabled on their account; there is no separate vendor-type enum anywhere
 * else in the codebase. Adding a module means adding one entry here first,
 * then scaffolding its folder under src/app/vendor/[vendorId]/<slug>/ —
 * never the other way around.
 *
 * This file is imported by at least one Client Component (vendor
 * settings' module toggle grid), so it MUST stay free of any node:fs/
 * node:path dependency — getModule()/buildVendorNavGroups() with
 * Super-Admin label/icon overrides applied live in moduleRegistry.ts
 * instead, which layers moduleAppearance.ts's fs-based store on top of
 * the pure data here. Same split pattern as renderTemplate.ts/
 * numberingFormat.ts elsewhere in this codebase — see DESIGN_SYSTEM.md §8.
 */

export type ModuleTaxonomy = "vertical" | "cross-cutting" | "brand";

export interface ModuleDefinition {
  /** URL-safe slug — matches the folder name under src/app/vendor/[vendorId]/ */
  slug: string;
  /** Human-facing name */
  label: string;
  /** One-line description of what the module is for */
  description: string;
  /**
   * Sidebar dot color per DESIGN_SYSTEM.md:
   * vertical = teal, cross-cutting = neutral, brand = amber
   */
  taxonomy: ModuleTaxonomy;
  /** Super-Admin-set icon override (src/lib/designer/icons.ts key) — undefined until customized. */
  icon?: string;
}

export const MODULES: ModuleDefinition[] = [
  // --- Core four ---
  { slug: "pos", label: "POS", description: "Sales, store-exclusive point of sale.", taxonomy: "vertical" },
  { slug: "service-centre", label: "Service Centre", description: "Workorders and billing for repair/service shops.", taxonomy: "vertical" },
  { slug: "billing", label: "Billing", description: "Standalone invoicing and billing.", taxonomy: "vertical" },
  { slug: "brand", label: "Brand", description: "Multi-location / multi-partner hierarchy: Brand → Partners → Locations.", taxonomy: "brand" },

  // --- Verticals ---
  { slug: "clinic", label: "Clinic", description: "Patient/client records, appointment scheduling, consultation billing.", taxonomy: "vertical" },
  { slug: "amc-field-service", label: "AMC / Field Service", description: "Recurring maintenance contracts, technician dispatch and scheduling.", taxonomy: "vertical" },
  { slug: "restaurant-pos", label: "Restaurant POS", description: "KOT and table management — specialized POS variant.", taxonomy: "vertical" },
  { slug: "subscriptions", label: "Subscriptions / Membership", description: "Gyms, coaching, clubs — recurring billing and check-in.", taxonomy: "vertical" },
  { slug: "real-estate", label: "Real Estate", description: "Listings, site visits, leads, agreements.", taxonomy: "vertical" },
  { slug: "rentals", label: "Rentals / Booking", description: "Equipment, venue, or asset booking calendar.", taxonomy: "vertical" },
  { slug: "education", label: "Education / Coaching", description: "Student enrollment, batches, fees, attendance.", taxonomy: "vertical" },
  { slug: "manufacturing", label: "Manufacturing / Production", description: "Bill of materials, production work orders, raw material consumption.", taxonomy: "vertical" },
  { slug: "wholesale-b2b", label: "Wholesale / Distributor B2B", description: "Bulk pricing, dealer/distributor accounts, credit terms.", taxonomy: "vertical" },
  { slug: "logistics-fleet", label: "Logistics / Fleet", description: "Delivery tracking, vehicle and driver management.", taxonomy: "vertical" },
  { slug: "legal", label: "Legal / Case Management", description: "Client matters, billable hours, document tracking.", taxonomy: "vertical" },
  { slug: "event-booking", label: "Event / Venue Booking", description: "Event scheduling, banquet halls, catering.", taxonomy: "vertical" },

  // --- Cross-cutting (plug into any vertical, not standalone verticals) ---
  { slug: "inventory", label: "Inventory / Warehouse", description: "Stock, purchase orders, suppliers — shared across POS/SC/Restaurant/etc.", taxonomy: "cross-cutting" },
  { slug: "accounting-gst", label: "Accounting / GST Compliance", description: "Tax returns, e-invoicing — India-specific compliance layer.", taxonomy: "cross-cutting" },
  { slug: "loyalty-rewards", label: "Loyalty & Rewards", description: "Points/cashback — usable across POS/Restaurant/Clinic/etc.", taxonomy: "cross-cutting" },
  { slug: "hrms", label: "HRMS / Payroll", description: "Staff attendance, payroll — add-on to any module.", taxonomy: "cross-cutting" },

  // --- Special case ---
  { slug: "marketplace", label: "Marketplace / Vendor Aggregator", description: "Multiple vendors under one umbrella — coordinates with central-api's own vendor concept, does not duplicate it.", taxonomy: "cross-cutting" },
];

/**
 * Pure lookup — no Super-Admin label/icon override applied (that needs
 * fs, see file header). Server Components that want overrides applied
 * should use getModule() from moduleRegistry.ts instead; this export
 * stays for pure/static use (and is what moduleRegistry.ts itself
 * builds on top of).
 */
export function getModule(slug: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function taxonomyDotClass(taxonomy: ModuleTaxonomy): string {
  switch (taxonomy) {
    case "vertical":
      return "bg-teal";
    case "brand":
      return "bg-accent";
    case "cross-cutting":
    default:
      return "bg-text-muted";
  }
}

/** AppShell's NavDotVariant, duplicated here (not imported) to keep this file
 *  framework-agnostic — it's pure data, not a React module. */
export type NavDot = "teal" | "amber" | "neutral";

export function taxonomyToNavDot(taxonomy: ModuleTaxonomy): NavDot {
  switch (taxonomy) {
    case "vertical":
      return "teal";
    case "brand":
      return "amber";
    case "cross-cutting":
    default:
      return "neutral";
  }
}

/**
 * Per-module sidebar sub-item overrides — most modules get the generic
 * List/+New/Admin trio (see moduleRegistry.ts), but a module whose real
 * sub-pages don't fit that shape (Inventory is a hub of six sections, not
 * one record list) lists its actual sub-pages here instead. Keyed by
 * module slug; a module without an entry falls back to the generic trio.
 */
export const MODULE_SUB_NAV: Record<string, { key: string; label: string; href: string }[]> = {
  inventory: [
    { key: "inventory.bom", label: "Material Catalog (BOM)", href: "inventory/bom" },
    { key: "inventory.warehouses", label: "Warehouses", href: "inventory/warehouses" },
    { key: "inventory.stock", label: "Inventory (Stock)", href: "inventory/stock" },
    { key: "inventory.stock-adjustments", label: "Stock Adjustments", href: "inventory/stock-adjustments" },
    { key: "inventory.return-orders", label: "Return Orders", href: "inventory/return-orders" },
    { key: "inventory.part-orders", label: "Part Orders", href: "inventory/part-orders" },
    { key: "inventory.admin", label: "Admin", href: "inventory/admin" },
  ],
  "service-centre": [
    { key: "service-centre.list", label: "Workorders", href: "service-centre" },
    { key: "service-centre.new", label: "+ New Workorder", href: "service-centre/new" },
    { key: "service-centre.solutions", label: "Solutions", href: "service-centre/solutions" },
    { key: "service-centre.admin", label: "Admin", href: "service-centre/admin" },
  ],
};

export interface VendorNavSubItem {
  key: string;
  label: string;
  /** Path segment(s) relative to /vendor/[vendorId]/, e.g. "billing/new". */
  href: string;
}

export interface VendorNavGroup {
  title: string;
  items: {
    key: string;
    label: string;
    dot: NavDot;
    icon?: string;
    /** Path segment(s) relative to /vendor/[vendorId]/. Defaults to `key` when unset (true for module items, since a module's slug is its list-page route). */
    href?: string;
    subItems?: VendorNavSubItem[];
  }[];
}

/**
 * Builds the vendor sidebar's nav groups from the canonical MODULES list —
 * every module page uses this instead of hand-writing its own nav array,
 * so the sidebar can never drift from the module registry above.
 *
 * Pure — no Super-Admin label/icon override applied (that needs fs, see
 * file header). Use buildVendorNavGroups() from moduleRegistry.ts in any
 * Server Component that should reflect overrides (which is effectively
 * everywhere it's currently called — moduleRegistry.ts's version has the
 * same name and signature, so updating an import path is the only change
 * needed).
 */
export function buildVendorNavGroups(activeModuleSlug?: string): VendorNavGroup[] {
  const groups: Record<ModuleTaxonomy, ModuleDefinition[]> = {
    brand: [],
    vertical: [],
    "cross-cutting": [],
  };
  for (const m of MODULES) groups[m.taxonomy].push(m);

  const toItems = (mods: ModuleDefinition[]) =>
    mods.map((m) => ({
      key: m.slug,
      label: m.label,
      dot: taxonomyToNavDot(m.taxonomy),
      active: m.slug === activeModuleSlug,
    }));

  return [
    { title: "Brand", items: toItems(groups.brand) },
    { title: "Modules", items: toItems(groups.vertical) },
    { title: "Cross-cutting", items: toItems(groups["cross-cutting"]) },
  ];
}

/**
 * A Vendor's "type" is just its enabled modules (see DESIGN_SYSTEM.md §7).
 * There is no real per-vendor enabled-modules record yet — no database, no
 * signup persistence — so this is a plausible DEMO set for the sample
 * vendor, standing in for what would otherwise be a real lookup once a
 * Vendor record exists. Everything downstream (the dynamic dashboard,
 * analytics) is built to consume whatever this returns, so swapping this
 * for a real query later requires no changes to the consumers.
 */
export function getDemoEnabledModules(_vendorId: string): string[] {
  return ["pos", "service-centre", "billing", "inventory"];
}
