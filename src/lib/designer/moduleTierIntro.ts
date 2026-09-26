/**
 * Module-specific tier intro copy for /help/modules/[slug] — one short
 * sentence per module per tier, describing what that tier is *for* in
 * that module's own terms (not the generic "everything needed to start"
 * blurb every module used to share). Grounded in the same real feature
 * lists as MODULE_TIER_FEATURES (src/lib/designer/moduleTiers.ts) — this
 * file only adds framing prose, it invents no capability that isn't
 * already listed there.
 *
 * NOTE for whoever next touches the pricing page's per-business-type copy:
 * at the time this was written, src/app/pricing/page.tsx had no reusable
 * per-type intro-copy object of its own (only one hardcoded "What you get"
 * section for service-centre). If a future pass adds one, prefer merging
 * that with this file rather than maintaining two descriptions of the same
 * modules — this is the single source for now.
 */

export const MODULE_TIER_INTRO: Record<string, { basic: string; pro: string; ultimate: string }> = {
  pos: {
    basic: "A working till: ring up a multi-item sale, take cash/UPI/card, print a receipt.",
    pro: "Adds accountability at the counter — split payments across two methods, and stock moves in Inventory the moment a sale happens (with a clean restore if it's voided).",
    ultimate: "Turns every sale into a real GST invoice and rolls sales up across branches, plus lets repeat customers earn Loyalty points at checkout.",
  },
  "service-centre": {
    basic: "One login to run repair jobs end to end — intake a device, track its fault, close the job, and invoice it (GST or non-GST) with a link the customer can check status on.",
    pro: "Adds the record-keeping a growing shop needs: a real customer database, a fault/symptom/solution library, a named staff roster, quotations, credit/debit notes, delivery challans, UPI QR payments, and its own inventory/brand/model catalog with a report builder.",
    ultimate: "Adds the financial and multi-branch layer — ledger book, P&L and expense tracking, unlimited sub-centres under one login with centralized reporting, and automated daily/weekly/monthly business reports.",
  },
  billing: {
    basic: "Everything a standalone billing desk needs — GST invoices, customers, items, payments, and credit/debit notes.",
    pro: "Adds recurring invoices so subscription-style billing doesn't need re-typing every cycle, plus outstanding and tax-summary reports and per-contact statements.",
    ultimate: "Adds the full accounting suite — real ledgers, a GST Assistant, and sync with central-api's accounting.",
  },
  telecalling: {
    basic: "A working calling desk — bulk-upload a lead list, work it from a queue, click-to-call straight from the app, and give each agent their own generated Agent ID.",
    pro: "Adds territory-based auto-assignment by state/city, SMS/WhatsApp template messages, and call disposition logging so a manager can see how each call ended.",
    ultimate: "Removes the agent-count ceiling and adds the Custom Report Builder & Analytics plus priority support.",
  },
  brand: {
    basic: "The core hierarchy — Brand → Partner → Location — plus a partner directory to see who's under the brand.",
    pro: "Adds location-level performance rollups and the ability to assign roles across locations, not just within one.",
    ultimate: "Adds a brand-wide analytics dashboard and multi-brand marketplace aggregation for groups running more than one brand.",
  },
  clinic: {
    basic: "Patient records and appointment scheduling — the two things a clinic needs on day one.",
    pro: "Adds consultation billing and handles doctor/staff scheduling conflicts as the patient list grows.",
    ultimate: "Adds treatment history with recall reminders and insurance/TPA billing integration.",
  },
  "amc-field-service": {
    basic: "AMC contract records and service scheduling — enough to run a recurring-maintenance business.",
    pro: "Adds technician dispatch with route assignment and contract renewal reminders so nothing lapses quietly.",
    ultimate: "Adds SLA breach tracking with escalation, plus the ability to pull in Field Force technicians for overflow.",
  },
  "restaurant-pos": {
    basic: "Table and KOT management with a menu and modifiers — the essentials for a dine-in floor.",
    pro: "Adds split-bill and merge-table handling, and routes kitchen display tickets by station.",
    ultimate: "Adds multi-outlet menu sync and aggregator-style order ingestion (Swiggy/Zomato-pattern).",
  },
  subscriptions: {
    basic: "Membership plans and check-in tracking — enough to run a gym or club's front desk.",
    pro: "Adds recurring billing cycles and the ability to freeze or pause a membership without losing history.",
    ultimate: "Adds usage-based add-on billing and lets a membership move between locations.",
  },
  "real-estate": {
    basic: "Listings and lead capture — get inventory and interest tracked from day one.",
    pro: "Adds site visit scheduling and agreement/document tracking as deals move forward.",
    ultimate: "Adds commission/payout tracking and multi-agent pipeline reporting for a growing team.",
  },
  rentals: {
    basic: "An asset/booking calendar with availability checking — the core of any rental desk.",
    pro: "Adds deposit and damage-charge handling plus overdue-return alerts.",
    ultimate: "Adds dynamic/seasonal pricing and multi-location asset transfer.",
  },
  education: {
    basic: "Student enrollment and batch/class scheduling — enough to run admissions and a timetable.",
    pro: "Adds fee collection with due tracking and attendance tracking.",
    ultimate: "Adds report cards/progress tracking and parent portal notifications.",
  },
  manufacturing: {
    basic: "Bill of Materials and production work orders — the two records a shop floor runs on.",
    pro: "Adds raw material consumption tracking and work-in-progress stage tracking as jobs move through the floor.",
    ultimate: "Adds multi-stage production costing and yield/wastage analytics.",
  },
  "wholesale-b2b": {
    basic: "Dealer/distributor accounts and bulk order entry — the basics of a B2B order desk.",
    pro: "Adds tiered/bulk pricing rules and credit terms with credit-limit tracking.",
    ultimate: "Adds a multi-tier distributor hierarchy and automated reorder suggestions.",
  },
  "logistics-fleet": {
    basic: "Delivery records and a vehicle/driver directory — enough to track what's moving and who's driving it.",
    pro: "Adds live delivery status tracking and route assignment.",
    ultimate: "Adds fuel and maintenance cost tracking plus GPS-based delivery proof (photo/signature).",
  },
  legal: {
    basic: "Client matter records and document tracking — the case file basics.",
    pro: "Adds billable hours logging and a case timeline with milestones.",
    ultimate: "Adds trust accounting for client funds and court-date reminders with escalation.",
  },
  "salon-spa": {
    basic: "A booking calendar and service menu — enough to take appointments day one.",
    pro: "Adds stylist assignment with schedule-conflict checks and no-show tracking.",
    ultimate: "Adds stylist commission tracking and Loyalty & Rewards integration for repeat clients.",
  },
  "event-booking": {
    basic: "An event/venue calendar with booking capture — the essentials for taking bookings.",
    pro: "Adds catering/vendor coordination and deposit-and-payment-schedule tracking.",
    ultimate: "Adds multi-venue availability sync and guest list/seating management.",
  },
  inventory: {
    basic: "Stock levels, purchase orders, and suppliers — the core of any stockroom.",
    pro: "Adds stock adjustments, return orders, and low-stock reorder alerts.",
    ultimate: "Adds multi-warehouse stock transfer and serialized/batch/expiry tracking.",
  },
  "accounting-gst": {
    basic: "GST return generation and an HSN-wise summary — the compliance basics.",
    pro: "Adds an ITC register and e-Invoicing.",
    ultimate: "Adds multi-GSTIN consolidated filing and auditor/CA collaboration access.",
  },
  "loyalty-rewards": {
    basic: "Points on purchase and points redemption — the core loyalty loop.",
    pro: "Adds tiered membership (Silver/Gold/Platinum) and expiry-and-reminder campaigns.",
    ultimate: "Adds cross-module points (earn and spend across POS + Restaurant + Clinic) and referral rewards.",
  },
  hrms: {
    basic: "A staff directory with attendance tracking — the basics of managing a team.",
    pro: "Adds payroll processing and leave management.",
    ultimate: "Adds multi-branch payroll compliance and performance review cycles.",
  },
  marketplace: {
    basic: "A multi-vendor directory and vendor onboarding — enough to bring vendors onto the platform.",
    pro: "Adds commission/payout rules per vendor and a vendor performance dashboard.",
    ultimate: "Adds central-api cross-tenant vendor sync and marketplace-wide analytics.",
  },
  "field-force": {
    basic: "Engineer onboarding (services offered + serviceable pincodes) and a directory to see who's available.",
    pro: "Adds job matching by service and pincode, plus manual job allocation for dispatch.",
    ultimate: "Adds automated allocation rules, engineer performance/rating tracking, and a commission/fee model (backend-ready, not yet billed).",
  },
};

/** Fallback for any module slug MODULE_TIER_INTRO doesn't (yet) cover. */
export const GENERIC_TIER_INTRO = {
  basic: "Everything needed to start running this part of the business day to day.",
  pro: "Adds the accountability, assignment, and workflow controls a growing team needs.",
  ultimate: "Adds full financial/compliance integration and cross-module reach.",
} as const;
