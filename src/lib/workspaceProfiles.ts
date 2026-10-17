import { MODULES } from "@/lib/designer/modules";

export type WorkspaceSource = {
  table: string;
  label: string;
  recordModule?: string;
  state?: { column: string; json?: boolean; label: string; values: string[] };
};
export type WorkspaceProfile = {
  slug: string;
  label: string;
  sources: WorkspaceSource[];
  settings: { label: string; path: string }[];
};
const source = (table: string, label: string, column?: string, values: string[] = [], stateLabel = "Pending") : WorkspaceSource =>
  ({ table, label, ...(column ? { state: { column, values, label: stateLabel } } : {}) });
const records = (recordModule: string, label: string, values: string[] = [], stateLabel = "Pending"): WorkspaceSource =>
  ({ table: "business_records", recordModule, label, ...(values.length ? { state: { column: "status", json: true, values, label: stateLabel } } : {}) });

// Trusted SQL identifiers only. Never populate these definitions from forms or database JSON.
const PROFILES: Record<string, { sources: WorkspaceSource[]; settings: [string, string][] }> = {
  hotel: { sources: [records("hotel-rooms", "Rooms", ["Dirty"], "Rooms awaiting housekeeping"), records("hotel-stays", "Reservations", ["Checked in"], "Guests in house")], settings: [["Rooms and housekeeping", "hotel/rooms"], ["Reservations", "hotel"]] },
  pos: { sources: [records("pos", "Sales"), records("pos-returns", "Returns")], settings: [["Staff", "pos/staff/signup"], ["Till", "pos/till"]] },
  billing: { sources: [{ ...records("billing", "Invoices"), state: { column: "paymentStatus", json: true, values: ["Sent", "Overdue", "Partially Paid"], label: "Awaiting full payment" } }, records("billing-recurring", "Recurring schedules")], settings: [["Contacts", "billing/contacts"], ["Items", "billing/items"], ["Recurring invoices", "billing/recurring"]] },
  brand: { sources: [source("brands", "Brands"), source("locations", "Locations")], settings: [["Brands and locations", "brand"]] },
  clinic: { sources: [source("patients", "Patients"), source("appointments", "Appointments", "status", ["Scheduled", "In consultation"], "Upcoming / in consultation")], settings: [["Patients", "clinic/patients"], ["Appointments", "clinic/appointments"]] },
  "amc-field-service": { sources: [source("amc_contracts", "Contracts", "contractStatus", ["Expired"], "Expired contracts")], settings: [["Contracts and visits", "amc-field-service"]] },
  "restaurant-pos": { sources: [source("restaurant_orders", "Orders", "status", ["Open"], "Open orders"), source("restaurant_tables", "Tables")], settings: [["Tables and orders", "restaurant-pos/tables"]] },
  subscriptions: { sources: [source("subscribers", "Members", "status", ["Active"], "Active members"), source("subscription_plans", "Membership plans")], settings: [["Membership plans", "subscriptions/plans"]] },
  "real-estate": { sources: [source("properties", "Properties"), source("enquiries", "Enquiries", "stage", ["New", "Site Visit Scheduled", "Negotiation"], "Open enquiries")], settings: [["Properties", "real-estate/properties"]] },
  rentals: { sources: [source("rental_assets", "Assets"), source("rental_agreements", "Agreements", "status", ["Requested"], "Requested bookings")], settings: [["Assets", "rentals/assets"]] },
  education: { sources: [source("students", "Students"), source("batches", "Batches", "status", ["Upcoming"], "Upcoming batches")], settings: [["Courses", "education/courses"], ["Batches", "education/batches"], ["Students", "education/students"]] },
  manufacturing: { sources: [source("production_orders", "Production orders", "status", ["Delayed"], "Delayed orders"), source("bill_of_materials", "Bills of materials")], settings: [["Bills of materials", "manufacturing/bom"], ["Work centers", "manufacturing/work-centers"]] },
  "wholesale-b2b": { sources: [source("wholesale_orders", "Orders", "status", ["Pending"], "Pending orders"), source("wholesale_customers", "Customers")], settings: [["Customers", "wholesale-b2b/customers"], ["Price tiers", "wholesale-b2b/price-tiers"]] },
  "logistics-fleet": { sources: [source("trips", "Trips", "deliveryStage", ["Pending", "Out for Delivery"], "Awaiting delivery"), source("vehicles", "Vehicles")], settings: [["Vehicles", "logistics-fleet/vehicles"], ["Drivers", "logistics-fleet/drivers"]] },
  legal: { sources: [source("legal_matters", "Matters", "status", ["Open"], "Open matters"), source("legal_clients", "Clients")], settings: [["Clients", "legal/clients"], ["Matters and documents", "legal"]] },
  "event-booking": { sources: [source("event_bookings", "Bookings", "status", ["Requested"], "Requested bookings"), source("venues", "Venues")], settings: [["Venues", "event-booking/venues"], ["Resources", "event-booking/resources"]] },
  "salon-spa": { sources: [source("salon_appointments", "Appointments", "status", ["Booked"], "Booked appointments"), source("salon_services", "Services")], settings: [["Service menu", "salon-spa/services"]] },
  telecalling: { sources: [source("leads", "Leads", "status", ["New"], "New leads"), source("calls", "Calls logged")], settings: [["Agents", "telecalling/agents"], ["Message templates", "telecalling/templates"]] },
  inventory: { sources: [records("inventory-stock", "Stock positions"), records("inventory-stock-transfers", "Transfers")], settings: [["Warehouses", "inventory/warehouses"], ["Materials / BOM", "inventory/bom"], ["Stock policy and balances", "inventory/stock"]] },
  "accounting-gst": { sources: [records("accounting-gst", "Returns"), records("accounting-gst-itc", "ITC entries")], settings: [["ITC register", "accounting-gst/itc"], ["Return generation", "accounting-gst/generate"]] },
  accounting: { sources: [source("journal_entries", "Journal entries"), source("chart_of_accounts", "Accounts")], settings: [["Chart of accounts", "accounting/chart-of-accounts"], ["Fiscal periods", "accounting/fiscal-periods"]] },
  "loyalty-rewards": { sources: [source("loyalty_members", "Members", "status", ["Active"], "Active members")], settings: [["Members and points", "loyalty-rewards"]] },
  hrms: { sources: [source("employees", "Employees", "status", ["Active"], "Active employees"), source("office_locations", "Office locations")], settings: [["Office locations", "hrms/office-locations"], ["Employee attendance logins", "hrms/employee-access"], ["Employees", "hrms"], ["Payroll", "hrms/payroll"]] },
  marketplace: { sources: [source("marketplace_orders", "Orders", "status", ["Pending"], "Pending orders"), source("marketplace_listings", "Listings")], settings: [["Vendor settings", "marketplace/vendor"], ["Listings", "marketplace"]] },
  "field-force": { sources: [source("bookings", "Bookings", "status", ["requested"], "Awaiting assignment"), source("providers", "Providers", "status", ["pending"], "Providers awaiting approval")], settings: [["Providers", "field-force"], ["Companies", "field-force/companies"], ["Job allocation", "field-force/allocations"]] },
  // Existing Service Centre pages, metrics, settings and Telegram remain on their legacy path.
  "service-centre": { sources: [], settings: [] },
};

export function getWorkspaceProfiles(slugs: readonly string[]): WorkspaceProfile[] {
  const enabled = new Set(slugs);
  return MODULES.filter(m => enabled.has(m.slug) && PROFILES[m.slug]).map(m => ({
    slug: m.slug, label: m.label, sources: PROFILES[m.slug].sources,
    settings: PROFILES[m.slug].settings.map(([label, path]) => ({ label, path })),
  }));
}

export function documentBelongsToWorkspace(id: string, slugs: readonly string[]): boolean {
  if (id.startsWith("invoice.")) return slugs.includes("billing");
  return slugs.some(slug => id.startsWith(`${slug}.`));
}

// Only events with actual emitters are offered. Unimplemented scheduled reminders are omitted.
const MODULE_ALERTS: Record<string, string[]> = {
  billing: ["paymentReceived", "paymentDue"], inventory: ["lowStock"],
  legal: ["legalMatterStatusChanged"],
  manufacturing: ["productionDelayed", "productionStockShortfall", "productionCompleted"],
  "event-booking": ["eventBookingConfirmed", "eventPaymentReceived"],
  "wholesale-b2b": ["wholesaleLargeOrder", "wholesaleCreditLimitBreach"],
  education: ["educationEnrollmentConfirmed"],
  hrms: ["hrmsLateCheckIn", "hrmsLeaveRequestSubmitted", "hrmsLeaveDecided", "hrmsPayrollCompleted"],
  marketplace: ["marketplaceNewOrder"],
};
export function workspaceAlertKeys(slugs: readonly string[]): string[] {
  return [...new Set(["subscriptionExpiring", "generalAnnouncement", ...slugs.flatMap(slug => MODULE_ALERTS[slug] ?? [])])];
}

export function workspaceTelegramCommandAllowed(key: string, slugs: readonly string[]): boolean {
  if (["help", "test_message", "report_daily", "report_weekly", "report_monthly"].includes(key)) return true;
  // Announcements are an operator command, not a business command.
  if (key === "general_announcement") return false;
  const eventKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return workspaceAlertKeys(slugs).includes(eventKey);
}
