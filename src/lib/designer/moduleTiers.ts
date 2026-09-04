/**
 * The real Basic/Pro/Ultimate feature breakdown for every module in
 * MODULES (src/lib/designer/modules.ts) — content, not just a naming
 * convention. This is what /admin/modules (Super Admin overview) and
 * /help/modules (the partner-facing guide) both render from, and what a
 * Super Admin should use as the starting point when actually assigning
 * PartnerType.planTierByPage entries per page
 * (src/lib/designer/partnerTypesData.ts) for a given Partner Type —
 * that assignment stays config-only and per-type (a type can deviate from
 * this default), this file is the documented DEFAULT intent per module,
 * not a runtime enforcement layer (nothing in the app enforces tiers at
 * request time yet, same gap noted throughout this codebase).
 *
 * Each tier's feature list is additive — Pro includes everything in
 * Basic, Ultimate includes everything in Pro — same mental model as any
 * real SaaS pricing page.
 */

export type ModuleTierFeatures = {
  basic: string[];
  pro: string[];
  ultimate: string[];
};

export const MODULE_TIER_FEATURES: Record<string, ModuleTierFeatures> = {
  pos: {
    basic: ["Multi-item cart checkout", "Cash/UPI/Card tender capture", "Thermal/A4/A5 receipt printing"],
    pro: ["Split-tender payments across two methods", "Real-time stock deduction from Inventory", "Void sale with automatic stock restore"],
    ultimate: ["Real GST Billing invoice on every sale", "Multi-branch sales reporting", "Loyalty & Rewards points on checkout"],
  },
  "service-centre": {
    basic: ["Workorder creation and 4-stage lifecycle", "Solutions/parts line items", "Printable service order"],
    pro: ["Brand/Model/Technician assignment from live catalogs", "Estimate approval gate before repair starts", "Hold (parts pending) state"],
    ultimate: ["Warranty-aware non-chargeable jobs", "Real GST Billing invoice on close", "Multi-location workorder routing"],
  },
  billing: {
    basic: ["GST invoice creation", "Customers, Items, Payments", "Credit/Debit notes"],
    pro: ["Recurring invoices", "Outstanding & tax-summary reports", "Contact statements"],
    ultimate: ["Full accounting suite (ledgers, GST Assistant)", "Razorpay payment collection", "Central-api accounting sync"],
  },
  brand: {
    basic: ["Brand -> Partner -> Location hierarchy", "Partner directory"],
    pro: ["Location-level performance rollups", "Cross-location role assignment"],
    ultimate: ["Brand-wide analytics dashboard", "Multi-brand marketplace aggregation"],
  },
  clinic: {
    basic: ["Patient records", "Appointment scheduling"],
    pro: ["Consultation billing", "Doctor/staff scheduling conflicts"],
    ultimate: ["Treatment history & recall reminders", "Insurance/TPA billing integration"],
  },
  "amc-field-service": {
    basic: ["AMC contract records", "Service scheduling"],
    pro: ["Technician dispatch and route assignment", "Contract renewal reminders"],
    ultimate: ["SLA breach tracking & escalation", "Field Force integration for overflow technicians"],
  },
  "restaurant-pos": {
    basic: ["Table/KOT management", "Menu & modifiers"],
    pro: ["Split-bill and merge-table", "Kitchen display routing by station"],
    ultimate: ["Multi-outlet menu sync", "Aggregator (Swiggy/Zomato-style) order ingestion"],
  },
  subscriptions: {
    basic: ["Membership plans", "Check-in tracking"],
    pro: ["Recurring billing cycles", "Freeze/pause membership"],
    ultimate: ["Usage-based add-on billing", "Multi-location membership portability"],
  },
  "real-estate": {
    basic: ["Listings", "Lead capture"],
    pro: ["Site visit scheduling", "Agreement/document tracking"],
    ultimate: ["Commission/payout tracking", "Multi-agent pipeline reporting"],
  },
  rentals: {
    basic: ["Asset/booking calendar", "Availability check"],
    pro: ["Deposit & damage-charge handling", "Overdue return alerts"],
    ultimate: ["Dynamic/seasonal pricing", "Multi-location asset transfer"],
  },
  education: {
    basic: ["Student enrollment", "Batch/class scheduling"],
    pro: ["Fee collection & due tracking", "Attendance tracking"],
    ultimate: ["Report cards / progress tracking", "Parent portal notifications"],
  },
  manufacturing: {
    basic: ["Bill of Materials (BOM)", "Production work orders"],
    pro: ["Raw material consumption tracking", "Work-in-progress stage tracking"],
    ultimate: ["Multi-stage production costing", "Yield/wastage analytics"],
  },
  "wholesale-b2b": {
    basic: ["Dealer/distributor accounts", "Bulk order entry"],
    pro: ["Tiered/bulk pricing rules", "Credit terms & credit limit tracking"],
    ultimate: ["Multi-tier distributor hierarchy", "Automated reorder suggestions"],
  },
  "logistics-fleet": {
    basic: ["Delivery records", "Vehicle/driver directory"],
    pro: ["Live delivery status tracking", "Route assignment"],
    ultimate: ["Fuel & maintenance cost tracking", "GPS-based delivery proof (photo/signature)"],
  },
  legal: {
    basic: ["Client matter records", "Document tracking"],
    pro: ["Billable hours logging", "Case timeline/milestones"],
    ultimate: ["Trust accounting (client funds)", "Court-date reminders & escalation"],
  },
  "salon-spa": {
    basic: ["Booking calendar", "Service menu"],
    pro: ["Stylist assignment & schedule conflicts", "No-show tracking"],
    ultimate: ["Stylist commission tracking", "Loyalty & Rewards integration for repeat clients"],
  },
  "event-booking": {
    basic: ["Event/venue calendar", "Booking capture"],
    pro: ["Catering & vendor coordination", "Deposit & payment schedule"],
    ultimate: ["Multi-venue availability sync", "Guest list & seating management"],
  },
  inventory: {
    basic: ["Stock levels", "Purchase orders", "Suppliers"],
    pro: ["Stock adjustments & return orders", "Low-stock reorder alerts"],
    ultimate: ["Multi-warehouse stock transfer", "Serialized/batch/expiry tracking"],
  },
  "accounting-gst": {
    basic: ["GST return generation", "HSN-wise summary"],
    pro: ["ITC register", "e-Invoicing"],
    ultimate: ["Multi-GSTIN consolidated filing", "Auditor/CA collaboration access"],
  },
  "loyalty-rewards": {
    basic: ["Points on purchase", "Points redemption"],
    pro: ["Tiered membership (Silver/Gold/Platinum)", "Expiry & reminder campaigns"],
    ultimate: ["Cross-module points (POS + Restaurant + Clinic)", "Referral rewards"],
  },
  hrms: {
    basic: ["Staff directory", "Attendance tracking"],
    pro: ["Payroll processing", "Leave management"],
    ultimate: ["Multi-branch payroll compliance", "Performance review cycles"],
  },
  marketplace: {
    basic: ["Multi-vendor directory", "Vendor onboarding"],
    pro: ["Commission/payout rules per vendor", "Vendor performance dashboard"],
    ultimate: ["Central-api cross-tenant vendor sync", "Marketplace-wide analytics"],
  },
  "field-force": {
    basic: ["Engineer onboarding (services + serviceable areas)", "Engineer directory"],
    pro: ["Job matching by service + pincode", "Manual job allocation"],
    ultimate: ["Automated allocation rules", "Engineer performance/rating tracking", "Commission/fee model (backend-ready, not yet billed)"],
  },
};

export function getModuleTierFeatures(slug: string): ModuleTierFeatures | undefined {
  return MODULE_TIER_FEATURES[slug];
}
