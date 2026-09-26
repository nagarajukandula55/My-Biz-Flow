/**
 * Canonical module registry — the single source of truth for every module
 * type in My Biz Flow. A Partner's "type" is just the set of module slugs
 * enabled on their account; there is no separate partner-type enum anywhere
 * else in the codebase. Adding a module means adding one entry here first,
 * then scaffolding its folder under src/app/partner/[partnerId]/<slug>/ —
 * never the other way around.
 *
 * This file is imported by at least one Client Component (partner
 * settings' module toggle grid), so it MUST stay free of any node:fs/
 * node:path dependency — getModule()/buildPartnerNavGroups() with
 * Super-Admin label/icon overrides applied live in moduleRegistry.ts
 * instead, which layers moduleAppearance.ts's fs-based store on top of
 * the pure data here. Same split pattern as renderTemplate.ts/
 * numberingFormat.ts elsewhere in this codebase — see DESIGN_SYSTEM.md §8.
 */

export type ModuleTaxonomy = "vertical" | "cross-cutting" | "brand";

export interface ModuleDefinition {
  /** URL-safe slug — matches the folder name under src/app/partner/[partnerId]/ */
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
  { slug: "service-centre", label: "Manage SC", description: "Workorders and billing for repair/service shops.", taxonomy: "vertical" },
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
  { slug: "salon-spa", label: "Salon & Spa", description: "Beauty/personal-care bookings — service menu, stylist assignment, appointment scheduling.", taxonomy: "vertical" },

  // --- Cross-cutting (plug into any vertical, not standalone verticals) ---
  { slug: "inventory", label: "Inventory / Warehouse", description: "Stock, purchase orders, suppliers — shared across POS/SC/Restaurant/etc.", taxonomy: "cross-cutting" },
  { slug: "accounting-gst", label: "Accounting / GST Compliance", description: "Tax returns, e-invoicing — India-specific compliance layer.", taxonomy: "cross-cutting" },
  // Standalone general ledger (ChartOfAccount/JournalEntry/JournalLine/
  // FiscalPeriod — Prisma-backed, see prisma/schema.prisma). Distinct from
  // accounting-gst above: this is real double-entry bookkeeping and
  // financial reporting (Trial Balance/P&L/Balance Sheet), not GST return
  // filing — could later be fed by accounting-gst's data as source
  // documents, but that integration is out of scope for this pass.
  { slug: "accounting", label: "Accounting", description: "Standalone general ledger — Chart of Accounts, double-entry Journal Entries, Fiscal Period close, and Trial Balance/P&L/Balance Sheet reports.", taxonomy: "cross-cutting" },
  { slug: "loyalty-rewards", label: "Loyalty & Rewards", description: "Points/cashback — usable across POS/Restaurant/Clinic/etc.", taxonomy: "cross-cutting" },
  { slug: "hrms", label: "HRMS / Payroll", description: "Staff attendance, payroll — add-on to any module.", taxonomy: "cross-cutting" },

  // --- Special case ---
  { slug: "marketplace", label: "Marketplace / Partner Aggregator", description: "Multiple partners under one umbrella — coordinates with central-api's own vendor concept, does not duplicate it.", taxonomy: "cross-cutting" },

  { slug: "field-force", label: "Field Force", description: "A full home-services booking system: priced service catalog, customer bookings, dispatch of skilled/unskilled engineers by service and pincode, payment collection, and ratings.", taxonomy: "cross-cutting" },

  { slug: "telecalling", label: "Telecalling / Tele-marketing", description: "Bulk-upload a contact list, assign it to telecaller agents, click-to-call from the app to the phone's dialer, and trigger SMS/WhatsApp template messages (welcome, product links) per contact.", taxonomy: "cross-cutting" },
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
export const MODULE_SUB_NAV: Record<string, PartnerNavSubItem[]> = {
  // Prisma-backed Patient/Appointment/Prescription (see prisma/schema.prisma's
  // "Clinic" block and src/lib/clinic.ts), replacing the old single-page
  // BusinessRecord list/create/detail trio — Patients and Appointments are
  // now their own sections since an Appointment references a real Patient
  // row rather than a free-typed patient name.
  clinic: [
    { key: "clinic.patients.list", label: "Patients", href: "clinic/patients" },
    { key: "clinic.patients.new", label: "+ New Patient", href: "clinic/patients/new" },
    { key: "clinic.appointments.list", label: "Appointments", href: "clinic/appointments" },
    { key: "clinic.appointments.new", label: "+ New Appointment", href: "clinic/appointments/new" },
  ],
  "salon-spa": [
    { key: "salon-spa.list", label: "Appointments", href: "salon-spa" },
    { key: "salon-spa.new", label: "+ New Appointment", href: "salon-spa/new" },
    { key: "salon-spa.services", label: "Services", href: "salon-spa/services" },
  ],
  // Suggested Basic/Pro/Ultimate split for Super Admin to configure in
  // PartnerType.planTierByPage (/admin/partner-types) — config-only
  // guidance, same as every module; nothing here runtime-enforces it.
  // Basic: checkout + receipt (a till that rings up sales). Pro: split
  // tender, void sale, real stock deduction. Ultimate: real Billing
  // invoice linkage — the full GST-compliant paper trail.
  pos: [
    { key: "pos.list", label: "Sales", href: "pos" },
    { key: "pos.checkout", label: "+ New Sale", href: "pos/checkout" },
  ],
  "wholesale-b2b": [
    { key: "wholesale-b2b.list", label: "Orders", href: "wholesale-b2b" },
    { key: "wholesale-b2b.new", label: "+ New Order", href: "wholesale-b2b/new" },
    { key: "wholesale-b2b.customers", label: "Customers", href: "wholesale-b2b/customers" },
    { key: "wholesale-b2b.price-tiers", label: "Price Tiers", href: "wholesale-b2b/price-tiers" },
  ],
  inventory: [
    { key: "inventory.bom", label: "Material Catalog (BOM)", href: "inventory/bom" },
    { key: "inventory.warehouses", label: "Warehouses", href: "inventory/warehouses" },
    { key: "inventory.stock", label: "Inventory (Stock)", href: "inventory/stock" },
    { key: "inventory.stock-adjustments", label: "Stock Adjustments", href: "inventory/stock-adjustments" },
    { key: "inventory.stock-transfers", label: "Stock Transfers", href: "inventory/stock-transfers" },
    { key: "inventory.stock-take", label: "Stock Take", href: "inventory/stock-take" },
    { key: "inventory.return-orders", label: "Return Orders", href: "inventory/return-orders" },
    { key: "inventory.part-orders", label: "Part Orders", href: "inventory/part-orders" },
    // Pro+ money ledger over the same 5 source types above — see
    // src/lib/inventoryLedger.ts / inventory.transactions.list.
    { key: "inventory.transactions", label: "Transactions", href: "inventory/transactions" },
    // Real per-workorder consumption history (deductInventoryForWorkorderAction
    // writes one row per part line actually deducted) — so a partner can see
    // usage trends and reorder ahead, not just the current on-hand snapshot.
    { key: "inventory.consumption", label: "Parts Consumption", href: "inventory/consumption" },
    // Forward-looking reorder forecast over a partner-configurable window
    // (default 30 days) — see src/lib/inventoryForecast.ts.
    { key: "inventory.part-planning", label: "Part Planning", href: "inventory/part-planning" },
    { key: "inventory.ageing", label: "Material Ageing", href: "inventory/ageing" },
  ],
  // Suggested Basic/Pro/Ultimate split for Super Admin to configure in
  // PartnerType.planTierByPage (/admin/partner-types) — config-only
  // guidance, same as every module; nothing here runtime-enforces it.
  // Basic: workorders list/create/detail — ring up a repair job and track
  // its stage. Pro: brand/model catalogs and the staff-name roster, estimate approval,
  // hold state — the accountability layer AN-CRM gates similarly behind
  // its higher plans. Ultimate: real Billing invoice creation on close.
  // Sectioned (see PartnerNavSubItem.section) rather than one flat list,
  // mirroring how the AN-CRM reference app groups its own service-centre
  // nav (Workorders / Masters / Reports / Account) instead of stacking
  // every page at one level. Only pages that actually exist in this
  // module are listed — AN-CRM's vendor-accounting entries (Financial
  // Statement / Ledger Book => billing/reports/contact-statement, Profit
  // & Loss => billing/reports/profit-loss, Expenses => billing/expenses)
  // live in MBF's separate `billing` module, which is gated by its own
  // PartnerType.defaultModules entry and carries its own sidebar group,
  // so they are deliberately NOT duplicated here.
  "service-centre": [
    { key: "service-centre.list", label: "Workorders", href: "service-centre", section: "Workorders" },
    { key: "service-centre.new", label: "+ New Workorder", href: "service-centre/new", section: "Workorders" },
    { key: "service-centre.inquiries.list", label: "Inquiries", href: "service-centre/inquiries", section: "Workorders" },
    // Parts marked "Part Not Available" on a workorder (WorkorderLifecycle's
    // per-line PNA flow, createPnaEntryAction) land here — a real work
    // queue for owner/staff to go source them, distinct from the workorder
    // they were raised on. Lives at top level next to Workorders/Inquiries
    // rather than under Masters (it's a queue to action, not a catalog).
    { key: "service-centre.pna", label: "Parts Not Available", href: "service-centre/pna", section: "Workorders" },
    // Masters used to be five (six, with Staff Names) flat rows each
    // repeating the "Masters" section heading — collapsed into one nested
    // nav item instead, so the module's sub-nav reads as one section
    // rather than a stack of top-level rows (Sidebar.tsx renders a second
    // nesting level for a sub-item that itself carries subItems).
    {
      key: "service-centre.masters",
      label: "Masters",
      href: "service-centre/brands",
      subItems: [
        { key: "service-centre.brands", label: "Brands", href: "service-centre/brands" },
        { key: "service-centre.models", label: "Models", href: "service-centre/models" },
        { key: "service-centre.customers", label: "Customers", href: "service-centre/customers" },
        { key: "service-centre.solutions", label: "Solutions", href: "service-centre/solutions" },
        { key: "service-centre.fault-codes", label: "Fault Codes", href: "service-centre/fault-codes" },
        { key: "service-centre.symptom-codes", label: "Symptom Codes", href: "service-centre/symptom-codes" },
        // Names only — the source of the suggestion lists on a workorder's
        // Logged By / Engineer / Collected By fields. Not a login and not
        // an assignment roster; Service Centre has neither.
        { key: "service-centre.staff-names", label: "Staff Names", href: "service-centre/staff-names" },
      ],
    },
    // Analytics dropped from here — same partner-wide page already
    // reachable from the Common group; keeping it here too just
    // duplicated the link.
    { key: "service-centre.reports", label: "Report Builder", href: "service-centre/reports", section: "Reports" },
    // SC Profiles (AN-CRM's own vendor-onboarding-status tracking — not
    // applicable from a partner's own logged-in view of their own
    // business) and the Admin scaffold (an unimplemented,
    // Super-Admin-only placeholder superseded by nothing since it never
    // had real functionality) are both removed.
    { key: "service-centre.sub-scs", label: "Sub-Centres", href: "service-centre/sub-scs", section: "Account" },
    { key: "service-centre.payments", label: "Payments & Settlements", href: "service-centre/payments", section: "Account" },
    { key: "service-centre.telegram", label: "Telegram Alerts", href: "service-centre/telegram", section: "Account" },
    { key: "service-centre.referrals", label: "Referrals", href: "service-centre/referrals", section: "Account" },
  ],
  "accounting-gst": [
    { key: "accounting-gst.dashboard", label: "Dashboard", href: "accounting-gst/dashboard" },
    { key: "accounting-gst.list", label: "Filed Returns", href: "accounting-gst" },
    { key: "accounting-gst.generate", label: "Generate Return", href: "accounting-gst/generate" },
    { key: "accounting-gst.hsn-summary", label: "HSN-wise Summary", href: "accounting-gst/hsn-summary" },
    { key: "accounting-gst.itc", label: "ITC Register", href: "accounting-gst/itc" },
  ],
  // Prisma-backed real data model (BillOfMaterial/BomLine, WorkCenter,
  // ProductionOrder/ProductionStageHistory — see prisma/schema.prisma and
  // src/lib/manufacturing.ts), replacing the old single-page BusinessRecord
  // list/create/detail trio. BOM and Work Centers are their own
  // masters sections since a Production Order now references real rows
  // in both rather than a free-text "BOM Reference" string.
  manufacturing: [
    { key: "manufacturing.list", label: "Production Orders", href: "manufacturing" },
    { key: "manufacturing.create", label: "+ New Production Order", href: "manufacturing/new" },
    { key: "manufacturing.bom.list", label: "Bill of Materials", href: "manufacturing/bom" },
    { key: "manufacturing.work-centers.list", label: "Work Centers", href: "manufacturing/work-centers" },
  ],
  "field-force": [
    { key: "field-force.bookings", label: "Bookings", href: "field-force/bookings" },
    { key: "field-force.bookings-new", label: "+ New Booking", href: "field-force/bookings/new" },
    { key: "field-force.list", label: "Engineers", href: "field-force" },
    { key: "field-force.onboard", label: "Onboard Engineer", href: "field-force/onboard" },
    { key: "field-force.allocations", label: "Job Allocation", href: "field-force/allocations" },
  ],
  "event-booking": [
    { key: "event-booking.list", label: "Bookings", href: "event-booking" },
    { key: "event-booking.new", label: "+ New Booking", href: "event-booking/new" },
    { key: "event-booking.calendar", label: "Calendar", href: "event-booking/calendar" },
    { key: "event-booking.venues", label: "Venues", href: "event-booking/venues" },
    { key: "event-booking.resources", label: "Resources", href: "event-booking/resources" },
  ],
  // Prisma-backed HRMS block (Employee/AttendanceCheckIn/OfficeLocation/
  // LeaveRequest/LeaveBalance/Payslip — see prisma/schema.prisma and
  // src/lib/hrms.ts). Employee is a deliberately separate table from
  // PartnerStaff, not coupled to it. Attendance is the live geofenced
  // check-in/check-out app; Attendance History is its filterable report.
  hrms: [
    { key: "hrms.list", label: "Employees", href: "hrms" },
    { key: "hrms.create", label: "+ New Employee", href: "hrms/new" },
    { key: "hrms.office-locations.list", label: "Office Locations", href: "hrms/office-locations" },
    { key: "hrms.attendance", label: "Attendance", href: "hrms/attendance" },
    { key: "hrms.attendance.history", label: "Attendance History", href: "hrms/attendance/history" },
    { key: "hrms.leave.list", label: "Leave", href: "hrms/leave" },
    { key: "hrms.payroll.list", label: "Payroll", href: "hrms/payroll" },
  ],
  telecalling: [
    { key: "telecalling.leads", label: "Leads", href: "telecalling" },
    { key: "telecalling.agents", label: "Agents", href: "telecalling/agents" },
    { key: "telecalling.templates", label: "Message Templates", href: "telecalling/templates" },
  ],
  legal: [
    { key: "legal.list", label: "Matters", href: "legal" },
    { key: "legal.new", label: "+ New Matter", href: "legal/new" },
    { key: "legal.clients", label: "Clients", href: "legal/clients" },
  ],
  accounting: [
    { key: "accounting.chart-of-accounts", label: "Chart of Accounts", href: "accounting/chart-of-accounts" },
    { key: "accounting.journal-entries", label: "Journal Entries", href: "accounting/journal-entries" },
    { key: "accounting.fiscal-periods", label: "Fiscal Periods", href: "accounting/fiscal-periods" },
    { key: "accounting.reports.trial-balance", label: "Trial Balance", href: "accounting/reports/trial-balance" },
    { key: "accounting.reports.profit-loss", label: "Profit & Loss", href: "accounting/reports/profit-loss" },
    { key: "accounting.reports.balance-sheet", label: "Balance Sheet", href: "accounting/reports/balance-sheet" },
  ],
  billing: [
    { key: "billing.list", label: "Invoices", href: "billing" },
    { key: "billing.new", label: "+ New Invoice", href: "billing/new" },
    { key: "billing.payments", label: "Payments", href: "billing/payments" },
    { key: "billing.credit-notes", label: "Credit/Debit Notes", href: "billing/credit-notes" },
    // The other three party-facing sales documents AN-CRM's shared
    // SalesDocument model covers (Quotation / Delivery Challan / Proforma
    // Invoice) — same contact + line-items + totals shape as an invoice,
    // so they live in Billing next to Credit/Debit Notes rather than
    // forking a second document tree inside Service Centre.
    { key: "billing.quotations", label: "Quotations", href: "billing/quotations" },
    { key: "billing.delivery-challans", label: "Delivery Challans", href: "billing/delivery-challans" },
    { key: "billing.proforma-invoices", label: "Proforma Invoices", href: "billing/proforma-invoices" },
    { key: "billing.expenses", label: "Expenses", href: "billing/expenses" },
    { key: "billing.reports", label: "Reports", href: "billing/reports" },
    { key: "billing.recurring", label: "Recurring Invoices", href: "billing/recurring" },
  ],
  marketplace: [
    { key: "marketplace.list", label: "Listings", href: "marketplace" },
    { key: "marketplace.new", label: "+ New Listing", href: "marketplace/new" },
    { key: "marketplace.orders", label: "Orders", href: "marketplace/orders" },
    { key: "marketplace.vendor", label: "Vendor Settings", href: "marketplace/vendor" },
  ],
  // Prisma-backed (Brand/Location — see prisma/schema.prisma,
  // "2026-09-25, second pass", and src/lib/brandData.ts), replacing the
  // old single-page BusinessRecord flat-location-list. Locations are now
  // nested under their own Brand rather than a flat list on the module root.
  brand: [
    { key: "brand.list", label: "Brands", href: "brand" },
    { key: "brand.new", label: "+ New Brand", href: "brand/new" },
  ],
  // Enrollments (root list) stayed BusinessRecord-backed; Batches/Courses/
  // Students moved onto real Prisma tables (Course/Batch/Student/
  // Enrollment/FeeInstallment/ClassAttendance — see src/lib/education.ts).
  education: [
    { key: "education.list", label: "Enrollments", href: "education" },
    { key: "education.new", label: "+ New Enrollment", href: "education/new" },
    { key: "education.batches", label: "Batches", href: "education/batches" },
    { key: "education.courses", label: "Courses", href: "education/courses" },
    { key: "education.students", label: "Students", href: "education/students" },
  ],
  // Now Prisma-backed (AmcContract + ServiceVisit — see
  // src/lib/amcContractsData.ts and prisma/schema.prisma "2026-09-25,
  // second pass"). Still the generic List/+New trio; the ServiceVisit log
  // lives nested on each contract's own detail page rather than as a
  // separate top-level sub-nav entry.
  "amc-field-service": [
    { key: "amc-field-service.list", label: "Contracts", href: "amc-field-service" },
    { key: "amc-field-service.new", label: "+ New Contract", href: "amc-field-service/new" },
  ],
};

export interface PartnerNavSubItem {
  key: string;
  label: string;
  /** Path segment(s) relative to /partner/[partnerId]/, e.g. "billing/new". */
  href: string;
  /**
   * Optional heading this sub-item sits under inside the module's expanded
   * sub-list (Sidebar.tsx renders one small caps label per run of
   * consecutive sub-items sharing a section). Purely presentational —
   * a module whose sub-items carry no section renders as a flat list,
   * exactly as before.
   */
  section?: string;
  /**
   * One extra level of nesting for a sub-item that is itself a group
   * (e.g. "Masters" collecting Brands/Models/Solutions/Fault Codes/
   * Symptom Codes/Staff Names) rather than a single page. Sidebar.tsx
   * renders these as a second, further-indented expand/collapse list.
   */
  subItems?: PartnerNavSubItem[];
}

export interface PartnerNavGroup {
  title: string;
  items: {
    key: string;
    label: string;
    dot: NavDot;
    icon?: string;
    /** Path segment(s) relative to /partner/[partnerId]/. Defaults to `key` when unset (true for module items, since a module's slug is its list-page route). */
    href?: string;
    subItems?: PartnerNavSubItem[];
  }[];
}

/**
 * Builds the partner sidebar's nav groups from the canonical MODULES list —
 * every module page uses this instead of hand-writing its own nav array,
 * so the sidebar can never drift from the module registry above.
 *
 * Pure — no Super-Admin label/icon override applied (that needs fs, see
 * file header). Use buildPartnerNavGroups() from moduleRegistry.ts in any
 * Server Component that should reflect overrides (which is effectively
 * everywhere it's currently called — moduleRegistry.ts's version has the
 * same name and signature, so updating an import path is the only change
 * needed).
 */
export function buildPartnerNavGroups(activeModuleSlug?: string): PartnerNavGroup[] {
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
 * A Partner's "type" is just its enabled modules (see DESIGN_SYSTEM.md §7).
 * There is no real per-partner enabled-modules record yet — no database, no
 * signup persistence — so this is a plausible DEMO set for the sample
 * partner, standing in for what would otherwise be a real lookup once a
 * Partner record exists. Everything downstream (the dynamic dashboard,
 * analytics) is built to consume whatever this returns, so swapping this
 * for a real query later requires no changes to the consumers.
 */
export function getDemoEnabledModules(_partnerId: string): string[] {
  return ["pos", "service-centre", "billing", "inventory"];
}
