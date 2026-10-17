/** Tier introductions follow verified module features; Service Centre copy is preserved. */
export const MODULE_TIER_INTRO: Record<string, { basic: string; pro: string; ultimate: string }> = {
  "pos": {
    "basic": "Multi-item cart checkout. Cash/UPI/Card tender capture. Thermal/A4/A5 receipt printing. Real-time stock deduction from Inventory. Void sale with automatic stock restore. Real GST Billing invoice on every sale.",
    "pro": "Adds Sales reports — revenue/count by outlet, cashier, payment mode, top products.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "service-centre": {
    "basic": "One login to run repair jobs end to end — intake a device, track its fault, close the job, and invoice it (GST or non-GST) with a link the customer can check status on.",
    "pro": "Adds the record-keeping a growing shop needs: a real customer database, a fault/symptom/solution library, a named staff roster, quotations, credit/debit notes, delivery challans, UPI QR payments, and its own inventory/brand/model catalog with a report builder.",
    "ultimate": "Adds the financial and multi-branch layer — ledger book, P&L and expense tracking, unlimited sub-centres under one login with centralized reporting, and automated daily/weekly/monthly business reports."
  },
  "billing": {
    "basic": "GST invoice creation. Customers, Items, Payments. Outstanding & tax-summary reports. Contact statements.",
    "pro": "Adds Quotations & Proforma Invoices; Credit/Debit notes; Delivery Challans; Recurring invoices.",
    "ultimate": "Adds Expense tracking; Profit & Loss report."
  },
  "telecalling": {
    "basic": "Bulk lead upload & call queue. Click-to-call from the app. Agent logins with generated Agent IDs. Territory-based auto-assignment (state/city). Call disposition logging.",
    "pro": "Adds SMS/WhatsApp template messages to leads.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "brand": {
    "basic": "Brand -> Partner -> Location hierarchy. Partner directory.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "clinic": {
    "basic": "Patient records. Appointment scheduling.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "amc-field-service": {
    "basic": "AMC contract records. Service scheduling.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "restaurant-pos": {
    "basic": "Table/KOT management. Menu & modifiers.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "subscriptions": {
    "basic": "Membership plans. Recurring billing cycles. Freeze/pause membership.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "real-estate": {
    "basic": "Listings. Lead capture.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "rentals": {
    "basic": "Asset/booking calendar. Availability check.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "education": {
    "basic": "Student enrollment. Batch/class scheduling. Attendance tracking.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "manufacturing": {
    "basic": "Bill of Materials (BOM). Production work orders. Work-in-progress stage tracking.",
    "pro": "Adds Work Centers — named production lines/stations.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "wholesale-b2b": {
    "basic": "Dealer/distributor accounts. Bulk order entry.",
    "pro": "Adds Tiered/bulk pricing rules.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "logistics-fleet": {
    "basic": "Delivery records. Vehicle/driver directory. Live delivery status tracking.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "legal": {
    "basic": "Client matter records. Document tracking. Case timeline/milestones.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "salon-spa": {
    "basic": "Booking calendar. Service menu.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "event-booking": {
    "basic": "Event/venue calendar. Booking capture.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "inventory": {
    "basic": "Stock levels. Part Orders. Warehouses. Stock Adjustments & Return Orders. Multi-warehouse Stock Transfer.",
    "pro": "Adds Material/BOM catalog authoring; Inventory money ledger (Transactions).",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "accounting": {
    "basic": "Chart of Accounts. Journal Entries. Fiscal Periods.",
    "pro": "Adds Trial Balance, Profit & Loss and Balance Sheet reports.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "accounting-gst": {
    "basic": "GST return preparation and exports (no portal filing). HSN-wise summary.",
    "pro": "Adds ITC register.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "loyalty-rewards": {
    "basic": "Points on purchase. Points redemption.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "hrms": {
    "basic": "Employee records. Employee sign-in and geofenced attendance.",
    "pro": "Adds Attendance-derived payroll drafts and payslip records; Leave management (no statutory filing).",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "marketplace": {
    "basic": "Multi-vendor directory. Vendor onboarding. Vendor orders.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "hotel": {
    "basic": "Owner-operated rooms and housekeeping. Reservations, group bookings and room moves. Guest folios, two-payer allocation and manual payment records.",
    "pro": "No additional verified feature is listed for this tier.",
    "ultimate": "No additional verified feature is listed for this tier."
  },
  "field-force": {
    "basic": "Engineer onboarding (services offered + serviceable pincodes) and a directory to see who's available.",
    "pro": "Adds job matching by service and pincode, plus manual job allocation for dispatch.",
    "ultimate": "Adds automated allocation rules, engineer performance/rating tracking, and a commission/fee model (backend-ready, not yet billed)."
  }
};

/** Unspecified tiers must not imply features or integrations that have not been verified. */
export const GENERIC_TIER_INTRO = {
  basic: "Review the listed workflows and enabled modules for this package.",
  pro: "Review the listed additional features before choosing this tier.",
  ultimate: "Review the listed additional features before choosing this tier.",
} as const;
