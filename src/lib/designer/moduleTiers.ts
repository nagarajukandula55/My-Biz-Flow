/**
 * The real Basic/Pro/Ultimate feature breakdown for every module in
 * MODULES (src/lib/designer/modules.ts) — content, not just a naming
 * convention. This is what /admin/modules (Super Admin overview) and
 * /help/modules (the partner-facing guide) both render from.
 *
 * Rewritten 2026-10-02 after an audit found this file had drifted badly
 * from reality: most bullets described features that are actually
 * available on every tier today ("always on" — no gate exists), and a
 * meaningful chunk described features that don't exist in the codebase at
 * all. Every module below (except service-centre, deliberately left
 * untouched, and field-force, which has no subscription ladder at all —
 * see its own note) now follows one consistent, honest 3-tier shape:
 *
 *   - Basic/Starter: the FULL core workflow the module exists for — never
 *     a crippled trial tier. A partner on Starter can actually run their
 *     business day to day.
 *   - Pro: Starter's features plus whatever is genuinely gated pro+ in
 *     DEFAULT_PAGE_TIERS (pageTiers.ts) for this module, if anything, PLUS
 *     the real account-level upgrades every Plan row actually carries —
 *     more seats/locations (Plan.maxUsers/maxLocations) and priority
 *     support. Deliberately positioned as the headline/best-value tier —
 *     this is where most of the real jump in value sits.
 *   - Ultimate: everything in Pro, unlimited seats/locations, and
 *     dedicated onboarding/SLA support — a real tier, but priced as the
 *     top anchor rather than where most partners are expected to land.
 *
 * "Priority support"/"Dedicated onboarding" are support-contract
 * commitments, not app features — same convention this file and
 * pageTiers.ts's TIER_FEATURES already used for Service Centre, not new
 * here. Seat/location caps are real Plan columns (maxUsers/maxLocations)
 * not yet enforced at request time (same documented-not-enforced status
 * as everything else in this file before a page actually checks it) —
 * listed because the data genuinely differs per Plan row, not invented.
 */

export type ModuleTierFeatures = {
  basic: string[];
  pro: string[];
  ultimate: string[];
};

export const MODULE_TIER_FEATURES: Record<string, ModuleTierFeatures> = {
  pos: {
    basic: [
      "Multi-item cart checkout",
      "Cash/UPI/Card tender capture",
      "Thermal/A4/A5 receipt printing",
      "Real-time stock deduction from Inventory",
      "Void sale with automatic stock restore",
      "Real GST Billing invoice on every sale",
      "1 outlet, up to 3 users",
    ],
    pro: [
      "Sales reports — revenue/count by outlet, cashier, payment mode, top products",
      "Up to 10 users across 3 outlets",
      "Priority support",
    ],
    ultimate: ["Unlimited users & outlets", "Dedicated onboarding & SLA-backed priority support"],
  },
  // Deliberately left untouched in this pass — Service Centre is the one
  // module with real partner usage today; its ladder stays exactly as
  // already enforced via DEFAULT_PAGE_TIERS.
  "service-centre": {
    basic: ["Single-login workorder flow: job card, device & fault intake to close", "GST & non-GST invoicing (no inventory or catalog storage)", "Customer-facing repair status tracking page"],
    pro: ["Customer database, fault/symptom/solution library, staff-name roster", "Quotations, Credit/Debit Notes, Delivery Challans, UPI payment QR", "Inventory, Brands/Models, Custom Report Builder & Analytics"],
    ultimate: ["Ledger Book, Profit & Loss reports and expense tracking", "Unlimited multi-center hierarchy under one login, centralized reporting", "Automated business reports (daily/weekly/monthly) and priority support"],
  },
  billing: {
    basic: ["GST invoice creation", "Customers, Items, Payments", "Outstanding & tax-summary reports", "Contact statements", "1 user"],
    pro: ["Quotations & Proforma Invoices", "Credit/Debit notes", "Delivery Challans", "Recurring invoices", "Up to 5 users", "Priority support"],
    ultimate: ["Expense tracking", "Profit & Loss report", "Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  telecalling: {
    basic: [
      "Bulk lead upload & call queue",
      "Click-to-call from the app",
      "Agent logins with generated Agent IDs",
      "Territory-based auto-assignment (state/city)",
      "Call disposition logging",
      "Up to 2 agents",
    ],
    pro: ["SMS/WhatsApp template messages to leads", "Up to 10 agents", "Priority support"],
    ultimate: ["Unlimited agents", "Dedicated onboarding & SLA-backed priority support"],
  },
  brand: {
    basic: ["Brand -> Partner -> Location hierarchy", "Partner directory", "Up to 5 users, 3 locations"],
    pro: ["Up to 20 users, 10 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  clinic: {
    basic: ["Patient records", "Appointment scheduling", "Up to 2 users, 1 location"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "amc-field-service": {
    basic: ["AMC contract records", "Service scheduling", "Up to 2 users, 1 location"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "restaurant-pos": {
    basic: ["Table/KOT management", "Menu & modifiers", "1 outlet, up to 3 users"],
    pro: ["Up to 10 users across 3 outlets", "Priority support"],
    ultimate: ["Unlimited users & outlets", "Dedicated onboarding & SLA-backed priority support"],
  },
  subscriptions: {
    basic: ["Membership plans", "Recurring billing cycles", "Freeze/pause membership", "Up to 2 users, 1 location"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "real-estate": {
    basic: ["Listings", "Lead capture", "Up to 3 users"],
    pro: ["Up to 15 agents", "Priority support"],
    ultimate: ["Unlimited agents & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  rentals: {
    basic: ["Asset/booking calendar", "Availability check", "Up to 2 users, 1 location"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  education: {
    basic: ["Student enrollment", "Batch/class scheduling", "Attendance tracking", "Up to 3 staff, 1 location"],
    pro: ["Up to 15 staff, 3 locations", "Priority support"],
    ultimate: ["Unlimited staff & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  manufacturing: {
    basic: ["Bill of Materials (BOM)", "Production work orders", "Work-in-progress stage tracking", "Up to 3 users, 1 location"],
    pro: ["Work Centers — named production lines/stations", "Up to 15 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "wholesale-b2b": {
    basic: ["Dealer/distributor accounts", "Bulk order entry", "Up to 3 users, 1 location"],
    pro: ["Tiered/bulk pricing rules", "Up to 15 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "logistics-fleet": {
    basic: ["Delivery records", "Vehicle/driver directory", "Live delivery status tracking", "Up to 3 users, 1 location"],
    pro: ["Up to 15 users, 5 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  legal: {
    basic: ["Client matter records", "Document tracking", "Case timeline/milestones", "Up to 3 users, 1 location"],
    pro: ["Up to 15 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "salon-spa": {
    basic: ["Booking calendar", "Service menu", "Up to 2 users, 1 location"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  "event-booking": {
    basic: ["Event/venue calendar", "Booking capture", "Up to 2 users, 1 location"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  inventory: {
    basic: ["Stock levels", "Part Orders", "Warehouses", "Stock Adjustments & Return Orders", "Multi-warehouse Stock Transfer"],
    pro: ["Material/BOM catalog authoring", "Inventory money ledger (Transactions)", "Priority support"],
    ultimate: ["Dedicated onboarding & SLA-backed priority support"],
  },
  // Standalone general ledger — distinct from accounting-gst below. Had
  // REAL enforced gating (DEFAULT_PAGE_TIERS) with no entry here at all
  // until now — the inverse problem from every other module in this file.
  accounting: {
    basic: ["Chart of Accounts", "Journal Entries", "Fiscal Periods"],
    pro: ["Trial Balance, Profit & Loss and Balance Sheet reports", "Priority support"],
    ultimate: ["Dedicated onboarding & SLA-backed priority support"],
  },
  "accounting-gst": {
    basic: ["GST return generation", "HSN-wise summary"],
    pro: ["ITC register", "Priority support"],
    ultimate: ["Dedicated onboarding & SLA-backed priority support"],
  },
  "loyalty-rewards": {
    basic: ["Points on purchase", "Points redemption", "Up to 1 location"],
    pro: ["Up to 5 locations", "Priority support"],
    ultimate: ["Unlimited locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  hrms: {
    basic: ["Staff directory", "Attendance tracking", "Up to 10 employees, 1 location"],
    pro: ["Payroll processing", "Leave management", "Up to 50 employees, 3 locations", "Priority support"],
    ultimate: ["Unlimited employees & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  marketplace: {
    basic: ["Multi-vendor directory", "Vendor onboarding", "Vendor orders", "Up to 3 users"],
    pro: ["Up to 10 users, 3 locations", "Priority support"],
    ultimate: ["Unlimited users & locations", "Dedicated onboarding & SLA-backed priority support"],
  },
  // Free to join, commission-based (see scripts/activateFieldForce.ts) —
  // not a Basic/Pro/Ultimate subscription ladder at all. Left out of this
  // map on purpose; getModuleTierFeatures(slug) returning undefined for
  // "field-force" is the correct, honest result until this module's own
  // pricing redesign happens (tracked separately, not a drive-by here).
};

export function getModuleTierFeatures(slug: string): ModuleTierFeatures | undefined {
  return MODULE_TIER_FEATURES[slug];
}
