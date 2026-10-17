/** Verified workflow descriptions. Empty premium lists do not imply extra features.
 * Non-Service Centre capacity limits and support contracts are not advertised until enforced/confirmed.
 * Service Centre descriptions are preserved verbatim. */
export type ModuleTierFeatures = { basic: string[]; pro: string[]; ultimate: string[] };
export const MODULE_TIER_FEATURES: Record<string, ModuleTierFeatures> = {
  "pos": {
    "basic": [
      "Multi-item cart checkout",
      "Cash/UPI/Card tender capture",
      "Thermal/A4/A5 receipt printing",
      "Real-time stock deduction from Inventory",
      "Void sale with automatic stock restore",
      "Real GST Billing invoice on every sale"
    ],
    "pro": [
      "Sales reports — revenue/count by outlet, cashier, payment mode, top products"
    ],
    "ultimate": []
  },
  "service-centre": {
    "basic": [
      "Single-login workorder flow: job card, device & fault intake to close",
      "GST & non-GST invoicing (no inventory or catalog storage)",
      "Customer-facing repair status tracking page"
    ],
    "pro": [
      "Customer database, fault/symptom/solution library, staff-name roster",
      "Quotations, Credit/Debit Notes, Delivery Challans, UPI payment QR",
      "Inventory, Brands/Models, Custom Report Builder & Analytics"
    ],
    "ultimate": [
      "Ledger Book, Profit & Loss reports and expense tracking",
      "Unlimited multi-center hierarchy under one login, centralized reporting",
      "Automated business reports (daily/weekly/monthly) and priority support"
    ]
  },
  "billing": {
    "basic": [
      "GST invoice creation",
      "Customers, Items, Payments",
      "Outstanding & tax-summary reports",
      "Contact statements"
    ],
    "pro": [
      "Quotations & Proforma Invoices",
      "Credit/Debit notes",
      "Delivery Challans",
      "Recurring invoices"
    ],
    "ultimate": [
      "Expense tracking",
      "Profit & Loss report"
    ]
  },
  "telecalling": {
    "basic": [
      "Bulk lead upload & call queue",
      "Click-to-call from the app",
      "Agent logins with generated Agent IDs",
      "Territory-based auto-assignment (state/city)",
      "Call disposition logging"
    ],
    "pro": [
      "SMS/WhatsApp template messages to leads"
    ],
    "ultimate": []
  },
  "brand": {
    "basic": [
      "Brand -> Partner -> Location hierarchy",
      "Partner directory"
    ],
    "pro": [],
    "ultimate": []
  },
  "clinic": {
    "basic": [
      "Patient records",
      "Appointment scheduling"
    ],
    "pro": [],
    "ultimate": []
  },
  "amc-field-service": {
    "basic": [
      "AMC contract records",
      "Service scheduling"
    ],
    "pro": [],
    "ultimate": []
  },
  "restaurant-pos": {
    "basic": [
      "Table/KOT management",
      "Menu & modifiers"
    ],
    "pro": [],
    "ultimate": []
  },
  "subscriptions": {
    "basic": [
      "Membership plans",
      "Recurring billing cycles",
      "Freeze/pause membership"
    ],
    "pro": [],
    "ultimate": []
  },
  "real-estate": {
    "basic": [
      "Listings",
      "Lead capture"
    ],
    "pro": [],
    "ultimate": []
  },
  "rentals": {
    "basic": [
      "Asset/booking calendar",
      "Availability check"
    ],
    "pro": [],
    "ultimate": []
  },
  "education": {
    "basic": [
      "Student enrollment",
      "Batch/class scheduling",
      "Attendance tracking"
    ],
    "pro": [],
    "ultimate": []
  },
  "manufacturing": {
    "basic": [
      "Bill of Materials (BOM)",
      "Production work orders",
      "Work-in-progress stage tracking"
    ],
    "pro": [
      "Work Centers — named production lines/stations"
    ],
    "ultimate": []
  },
  "wholesale-b2b": {
    "basic": [
      "Dealer/distributor accounts",
      "Bulk order entry"
    ],
    "pro": [
      "Tiered/bulk pricing rules"
    ],
    "ultimate": []
  },
  "logistics-fleet": {
    "basic": [
      "Delivery records",
      "Vehicle/driver directory",
      "Live delivery status tracking"
    ],
    "pro": [],
    "ultimate": []
  },
  "legal": {
    "basic": [
      "Client matter records",
      "Document tracking",
      "Case timeline/milestones"
    ],
    "pro": [],
    "ultimate": []
  },
  "salon-spa": {
    "basic": [
      "Booking calendar",
      "Service menu"
    ],
    "pro": [],
    "ultimate": []
  },
  "event-booking": {
    "basic": [
      "Event/venue calendar",
      "Booking capture"
    ],
    "pro": [],
    "ultimate": []
  },
  "inventory": {
    "basic": [
      "Stock levels",
      "Part Orders",
      "Warehouses",
      "Stock Adjustments & Return Orders",
      "Multi-warehouse Stock Transfer"
    ],
    "pro": [
      "Material/BOM catalog authoring",
      "Inventory money ledger (Transactions)"
    ],
    "ultimate": []
  },
  "accounting": {
    "basic": [
      "Chart of Accounts",
      "Journal Entries",
      "Fiscal Periods"
    ],
    "pro": [
      "Trial Balance, Profit & Loss and Balance Sheet reports"
    ],
    "ultimate": []
  },
  "accounting-gst": {
    "basic": [
      "GST return preparation and exports (no portal filing)",
      "HSN-wise summary"
    ],
    "pro": [
      "ITC register"
    ],
    "ultimate": []
  },
  "loyalty-rewards": {
    "basic": [
      "Points on purchase",
      "Points redemption"
    ],
    "pro": [],
    "ultimate": []
  },
  "hrms": {
    "basic": [
      "Employee records",
      "Employee sign-in and geofenced attendance"
    ],
    "pro": [
      "Attendance-derived payroll drafts and payslip records",
      "Leave management (no statutory filing)"
    ],
    "ultimate": []
  },
  "marketplace": {
    "basic": [
      "Multi-vendor directory",
      "Vendor onboarding",
      "Vendor orders"
    ],
    "pro": [],
    "ultimate": []
  },
  "hotel": {
    "basic": [
      "Owner-operated rooms and housekeeping",
      "Reservations, group bookings and room moves",
      "Guest folios, two-payer allocation and manual payment records"
    ],
    "pro": [],
    "ultimate": []
  }
};
export function getModuleTierFeatures(slug: string): ModuleTierFeatures | undefined { return MODULE_TIER_FEATURES[slug]; }
