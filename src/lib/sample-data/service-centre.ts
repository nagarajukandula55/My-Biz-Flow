import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_GROUPS,
  VEHICLE_CATEGORY_LABELS,
} from "@/lib/catalog/vehicleCategory";
import { PRODUCT_DOMAIN_LABELS } from "@/lib/catalog/productDomains";

// Workorder (JobSheet) sample data for the service-centre module — realistic
// field modeling, no backend wired up in this pass beyond the BusinessRecord
// store (see CLAUDE.md).
//
// DOMAIN: DEVICE_CATEGORIES below is ELECTRONICS-ONLY and stays that way.
// A partner who also services vehicles declares that separately
// (Partner.productDomains) and gets the parallel VEHICLE_CATEGORIES list
// from src/lib/catalog/vehicleCategory.ts alongside — the two taxonomies
// are only ever concatenated with domain <optgroup> headings at render
// time (src/lib/catalog/serviceCatalog.ts), never merged. Nothing below
// this line may gain a vehicle entry.
//
// Electronics and appliance repair, never vehicle service. The
// reference app this module is ported from types its job sheet's device
// against a fixed 45-category taxonomy (DEVICE_CATEGORIES below) that
// contains no vehicle category at all, and its CrmJobSheet model has no
// odometer/mileage/registration field of any kind. The two-wheeler sample
// devices and the `odometerReading` field that used to live here were
// invented by an earlier build pass rather than ported, and have been
// removed — `odometerReading` deliberately has no replacement, because
// inventing an "equivalent" electronics field with no counterpart in the
// reference app would repeat the same mistake.
//
// JobSheet <-> lineitem <-> invoice <-> payment chain: kept BusinessRecord-
// backed (this module, plus the existing "billing" module for the invoice
// itself) rather than promoted to real Prisma tables. Unlike Booking/
// JobAllocation (which became real tables because a booking is genuinely
// relational across Service/Provider/Customer with concurrent-slot
// constraints that need DB-level guarantees), a workorder's line items are
// an owned, append-mostly sub-list that only ever renders inside its own
// parent record — nothing else joins against an individual line, and the
// existing Billing invoice creation (createInvoiceFromWorkorderAction) and
// POS checkout (completeSaleAction) already establish this same read-modify-
// write-JSON pattern for cross-module linkage (workorder -> billing invoice,
// sale -> billing invoice) and for inventory deduction (against the
// "inventory-stock" module). Adding parallel Prisma tables here would fork
// that established pattern for no relational benefit. Revisit only if line
// items need to be queried/reported on independently of their parent job.

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Diagnosed": "warning",
  "In repair": "amber",
  "Ready": "teal",
  "Delivered": "success",
  "On hold": "danger"
};

/** Single-page workorder lifecycle stages — see WorkorderLifecycle.tsx. Kept as-is for backward compat with existing records/UI. */
export type WorkorderStage = "Created" | "In Progress" | "Completed" | "Closed";
export const WORKORDER_STAGES: WorkorderStage[] = ["Created", "In Progress", "Completed", "Closed"];

/**
 * Richer milestone lifecycle ported from the AN-CRM reference app
 * (CrmJobSheet) — recorded alongside the simpler WorkorderStage above
 * rather than replacing it, so existing records/UI keep working unmodified.
 * PART_PENDING corresponds to the existing onHold side-state rather than a
 * distinct WorkorderStage value; see mapStageToMilestone().
 */
export type MilestoneStatus =
  | "CREATED"
  | "REPAIR_STARTED"
  | "REPAIR_IN_PROGRESS"
  | "PART_PENDING"
  | "REPAIR_COMPLETED"
  | "CLOSED"
  | "CANCELLED";

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  "CREATED",
  "REPAIR_STARTED",
  "REPAIR_IN_PROGRESS",
  "PART_PENDING",
  "REPAIR_COMPLETED",
  "CLOSED",
  "CANCELLED",
];

export function mapStageToMilestone(stage: WorkorderStage, onHold?: boolean, cancelled?: boolean): MilestoneStatus {
  // Cancellation is a terminal side-branch recorded as `cancelledAt` on the
  // record rather than a WorkorderStage value (the four stages are the
  // linear happy path), so it takes precedence over whatever stage the job
  // was abandoned at.
  if (cancelled) return "CANCELLED";
  if (stage === "In Progress" && onHold) return "PART_PENDING";
  switch (stage) {
    case "Created": return "CREATED";
    case "In Progress": return "REPAIR_IN_PROGRESS";
    case "Completed": return "REPAIR_COMPLETED";
    case "Closed": return "CLOSED";
    default: return "CREATED";
  }
}

// --- Intake option lists, matched 1:1 to the AN-CRM reference app's own
// --- stored codes and labels so nothing here is an invented placeholder.

/** CrmJobSheet.warrantyStatus. IW and 90_DAYS are non-chargeable jobs. */
export const WARRANTY_STATUSES = ["IW", "OOW", "90_DAYS"] as const;
export const WARRANTY_STATUS_LABELS: Record<string, string> = {
  IW: "In Warranty (IW)",
  OOW: "Out of Warranty (OOW)",
  "90_DAYS": "90 Days Warranty",
};

/** CrmJobSheet.appointmentType — the reference app's APPOINTMENT_TYPE option list is exactly these two. */
export const APPOINTMENT_TYPES = ["ONSITE", "WALKIN"] as const;
export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  ONSITE: "Onsite",
  WALKIN: "Walk-in",
};

/** CrmJobSheet.requestType — the REQUEST_TYPE option list. */
export const REQUEST_TYPES = ["REPAIR", "INSTALLATION"] as const;
export const REQUEST_TYPE_LABELS: Record<string, string> = {
  REPAIR: "Repair",
  INSTALLATION: "Installation",
};

/** CrmJobSheet.deviceAppearance — the DEVICE_APPEARANCE option list. */
export const DEVICE_APPEARANCE_OPTIONS = ["GOOD", "USED", "DENTS", "BROKEN"] as const;
export const DEVICE_APPEARANCE_LABELS: Record<string, string> = {
  GOOD: "Good",
  USED: "Used",
  DENTS: "Dents/Scratches",
  BROKEN: "Broken/Damaged",
};

/** CrmJobSheet.fileBackupDescription — a plain yes/no at intake, not a note. */
export const FILE_BACKUP_OPTIONS = ["YES", "NO"] as const;
export const FILE_BACKUP_LABELS: Record<string, string> = { YES: "Yes", NO: "No" };

/**
 * Device Type taxonomy (CrmJobSheet.deviceCategory) — the reference app's
 * full 45-category electronics/appliance list, stored as the same codes so
 * a record is portable between the two apps.
 */
export const DEVICE_CATEGORIES = [
  "MOBILE", "FEATURE_PHONE", "TABLET", "LAPTOP", "DESKTOP", "MONITOR",
  "COMPUTER_ACCESSORY", "PRINTER_SCANNER", "TELEVISION", "PROJECTOR",
  "SET_TOP_BOX", "SOUNDBAR", "SPEAKER", "HEADPHONE_EARBUD", "SMARTWATCH",
  "FITNESS_BAND", "CAMERA", "CAMCORDER", "DRONE", "GAMING_CONSOLE",
  "ROUTER_NETWORKING", "POWER_BANK", "UPS_INVERTER", "CCTV_SECURITY",
  "SMART_HOME", "REFRIGERATOR", "WASHING_MACHINE", "AIR_CONDITIONER",
  "MICROWAVE", "OTG_OVEN", "DISHWASHER", "WATER_PURIFIER", "AIR_PURIFIER",
  "VACUUM_CLEANER", "CHIMNEY", "INDUCTION_COOKTOP", "MIXER_GRINDER",
  "WATER_HEATER", "IRON", "PERSONAL_GROOMING", "FAN", "AIR_COOLER",
  "CALCULATOR", "VR_HEADSET", "E_READER",
] as const;

export const DEVICE_CATEGORY_LABELS: Record<string, string> = {
  MOBILE: "Mobile Phones",
  FEATURE_PHONE: "Feature Phones",
  TABLET: "Tablets",
  LAPTOP: "Laptops",
  DESKTOP: "Desktop / PC",
  MONITOR: "Monitors",
  COMPUTER_ACCESSORY: "Computer Accessories",
  PRINTER_SCANNER: "Printers & Scanners",
  TELEVISION: "Television",
  PROJECTOR: "Projectors",
  SET_TOP_BOX: "Set-Top Box",
  SOUNDBAR: "Soundbars",
  SPEAKER: "Speakers",
  HEADPHONE_EARBUD: "Headphones & Earbuds",
  SMARTWATCH: "Smartwatches",
  FITNESS_BAND: "Fitness Bands",
  CAMERA: "Cameras",
  CAMCORDER: "Camcorders",
  DRONE: "Drones",
  GAMING_CONSOLE: "Gaming Consoles",
  ROUTER_NETWORKING: "Routers & Networking",
  POWER_BANK: "Power Banks",
  UPS_INVERTER: "UPS & Inverters",
  CCTV_SECURITY: "CCTV & Security",
  SMART_HOME: "Smart Home Devices",
  REFRIGERATOR: "Refrigerator",
  WASHING_MACHINE: "Washing Machine",
  AIR_CONDITIONER: "Air Conditioner",
  MICROWAVE: "Microwave",
  OTG_OVEN: "OTG / Oven Toaster Griller",
  DISHWASHER: "Dishwasher",
  WATER_PURIFIER: "Water Purifier",
  AIR_PURIFIER: "Air Purifier",
  VACUUM_CLEANER: "Vacuum Cleaner",
  CHIMNEY: "Kitchen Chimney",
  INDUCTION_COOKTOP: "Induction Cooktop",
  MIXER_GRINDER: "Mixer Grinder",
  WATER_HEATER: "Water Heater / Geyser",
  IRON: "Iron",
  PERSONAL_GROOMING: "Personal Grooming (Trimmer/Dryer)",
  FAN: "Fans",
  AIR_COOLER: "Air Cooler",
  CALCULATOR: "Calculators",
  VR_HEADSET: "VR Headsets",
  E_READER: "E-Readers",
};

/**
 * The full option universe for the workorder's "Device Type" — every
 * electronics category plus every vehicle class, each under its own domain
 * heading. This is the BASE field definition, used by the Designer's field
 * schema and by the edit form (so a vehicle job stays editable no matter
 * what the partner's domains say today). The CREATE form narrows it to the
 * partner's own declared domain(s) via categoryOptionsForDomains().
 *
 * Concatenated, never merged: DEVICE_CATEGORIES itself is untouched and
 * still electronics-only.
 */
const ALL_CATEGORY_OPTIONS: string[] = [...DEVICE_CATEGORIES, ...VEHICLE_CATEGORIES];

const ALL_CATEGORY_LABELS: Record<string, string> = {
  ...DEVICE_CATEGORY_LABELS,
  ...VEHICLE_CATEGORY_LABELS,
};

const ALL_CATEGORY_GROUPS: Record<string, string> = {
  ...Object.fromEntries(DEVICE_CATEGORIES.map((c) => [c, PRODUCT_DOMAIN_LABELS.ELECTRONICS])),
  ...Object.fromEntries(
    VEHICLE_CATEGORIES.map((c) => [c, `Automobiles — ${VEHICLE_CATEGORY_GROUPS[c] ?? "Other"}`])
  ),
};

export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Credit", "Other"] as const;

export interface PartLine {
  id: string;
  materialId: string;
  materialLabel: string;
  qty: number;
  serialized: boolean;
  serial?: string;
  pending?: boolean;
  pendingReason?: string;
  /** Per-line refs to the fault/symptom/solution catalogs — a job can have several parts, each addressing a different fault. */
  faultCodeId?: string;
  faultCodeLabel?: string;
  symptomCodeId?: string;
  symptomCodeLabel?: string;
  solutionId?: string;
  solutionLabel?: string;
  unit?: string;
  unitPrice?: number;
  taxRate?: number;
  hsnCode?: string;
  materialCode?: string;
  cost?: number;
  /** Batch/lot number of the specific stock consumed for this line — future-proofing beyond AN-CRM's BOM shape. */
  batchNumber?: string;
}

export interface ServiceLine {
  id: string;
  solutionId: string;
  solutionLabel: string;
  laborCharge: number;
  /** Per-line refs, same rationale as PartLine — a service line's fault/symptom needn't match another line's. */
  faultCodeId?: string;
  faultCodeLabel?: string;
  symptomCodeId?: string;
  symptomCodeLabel?: string;
  taxRate?: number;
  hsnCode?: string;
}

/**
 * One real, persisted stage transition. Appended by
 * patchServiceCentreWorkorderAction whenever a workorder's `stage` actually
 * changes, and by cancelWorkorderAction — this is the only source the
 * activity timeline reads transitions from (see getServiceCentreTimeline).
 * No actor/IP is recorded because the module has a single business login,
 * not per-user accounts.
 */
export interface StageHistoryEntry {
  /** ISO timestamp of the transition. */
  at: string;
  /** The stage (or "Cancelled") the workorder moved INTO. */
  stage: string;
}

/** Per-workorder lifecycle state, keyed by workorder id. Demo in-memory store — resets on reload, no backend yet. */
export const workorderLifecycle: Record<
  string,
  {
    stage: WorkorderStage;
    brandId?: string;
    brandName?: string;
    modelId?: string;
    modelName?: string;
    technicianId?: string;
    technicianName?: string;
    assignedAt?: string;
    onHold?: boolean;
    holdReason?: string;
    holdSince?: string;
    estimateApproved?: boolean;
    invoiceId?: string;
    appointmentRef?: string;
    partLines: PartLine[];
    serviceLines: ServiceLine[];
    handoverNotes?: string;
  }
> = {
  "WO-2291": {
    stage: "In Progress",
    brandName: "Samsung",
    modelName: "Galaxy S23",
    partLines: [
      { id: "PL-1", materialId: "MAT-1001", materialLabel: "MAT-1001 — Front Brake Pad Set", qty: 1, serialized: false },
    ],
    serviceLines: [{ id: "SL-1", solutionId: "SOL-002", solutionLabel: "Battery replacement", laborCharge: 150 }],
  },
  "WO-2290": {
    stage: "Completed",
    brandName: "Dell",
    modelName: "Inspiron 15 3520",
    partLines: [],
    serviceLines: [{ id: "SL-1", solutionId: "SOL-004", solutionLabel: "General service / cleaning", laborCharge: 200 }],
  },
  "WO-2289": {
    stage: "Created",
    brandName: "LG",
    modelName: "GL-T292RPZY Double Door",
    partLines: [],
    serviceLines: [],
  },
  "WO-2288": {
    stage: "Closed",
    brandName: "Sony",
    modelName: "Bravia X75L 55\"",
    partLines: [],
    serviceLines: [{ id: "SL-1", solutionId: "SOL-001", solutionLabel: "Screen replacement", laborCharge: 300 }],
    handoverNotes: "Handed over to customer at front desk.",
  },
};

export function getWorkorderLifecycle(workorderId: string) {
  return (
    workorderLifecycle[workorderId] ?? {
      stage: "Created" as WorkorderStage,
      partLines: [],
      serviceLines: [],
    }
  );
}

/**
 * Reads the lifecycle fields (stage/partLines/serviceLines/etc.) directly
 * off a real workorder's own BusinessRecord data — this is the real,
 * persisted path (see WorkorderLifecycle.tsx + updateWorkorderLifecycleAction),
 * distinct from getWorkorderLifecycle() above which only knows about the
 * few hand-authored sample workorders (WO-2288..WO-2291).
 */
export function extractLifecycleFromRecord(record: Row): {
  stage: WorkorderStage;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  technicianId?: string;
  technicianName?: string;
  assignedAt?: string;
  onHold?: boolean;
  holdReason?: string;
  holdSince?: string;
  estimateApproved?: boolean;
  invoiceId?: string;
  partLines: PartLine[];
  serviceLines: ServiceLine[];
  handoverNotes?: string;
  inventoryDeducted?: boolean;
  stageHistory: StageHistoryEntry[];
  cancelled: boolean;
  cancelReason?: string;
  cancelledAt?: string;
  paymentCollected?: boolean;
  paymentMode?: string;
  paymentCollectedAmount?: number;
} {
  return {
    stage: (record["stage"] as WorkorderStage | undefined) ?? "Created",
    brandId: record["brandId"] as string | undefined,
    brandName: record["brandName"] as string | undefined,
    modelId: record["modelId"] as string | undefined,
    modelName: record["modelName"] as string | undefined,
    technicianId: record["technicianId"] as string | undefined,
    technicianName: record["technicianName"] as string | undefined,
    assignedAt: record["assignedAt"] as string | undefined,
    onHold: Boolean(record["onHold"]),
    holdReason: record["holdReason"] as string | undefined,
    holdSince: record["holdSince"] as string | undefined,
    estimateApproved: Boolean(record["estimateApproved"]),
    invoiceId: record["invoiceId"] as string | undefined,
    partLines: (record["partLines"] as PartLine[] | undefined) ?? [],
    serviceLines: (record["serviceLines"] as ServiceLine[] | undefined) ?? [],
    handoverNotes: record["handoverNotes"] as string | undefined,
    inventoryDeducted: Boolean(record["inventoryDeducted"]),
    stageHistory: (record["stageHistory"] as StageHistoryEntry[] | undefined) ?? [],
    cancelled: Boolean(record["cancelledAt"]),
    cancelReason: record["cancelReason"] as string | undefined,
    cancelledAt: record["cancelledAt"] as string | undefined,
    paymentCollected: Boolean(record["paymentCollected"]),
    paymentMode: record["paymentMode"] as string | undefined,
    paymentCollectedAmount: record["paymentCollectedAmount"] as number | undefined,
  };
}


export const serviceCentreColumns: Column[] = [
  { key: "id", label: "Job ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "customerPhone", label: "Customer Phone", type: "phone" },
  { key: "customerEmail", label: "Customer Email", type: "text" },
  { key: "customerCompany", label: "Company", type: "text" },
  { key: "customerGstin", label: "Customer GSTIN", type: "text" },
  { key: "customerAddress", label: "Address", type: "text" },
  { key: "customerCity", label: "City", type: "text" },
  { key: "customerState", label: "State", type: "text" },
  { key: "customerPincode", label: "Pincode", type: "text" },
  { key: "loggedBy", label: "Logged By", type: "text" },
  { key: "deviceCategory", label: "Device Type", type: "text" },
  { key: "device", label: "Device", type: "text" },
  { key: "brandName", label: "Brand", type: "text" },
  { key: "modelName", label: "Model", type: "text" },
  { key: "technicianName", label: "Assigned Technician", type: "text" },
  { key: "priority", label: "Priority", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "receivedDate", label: "Received Date", type: "date" },
  { key: "estimatedAmount", label: "Estimated Amount", type: "currency" },
  { key: "warrantyFlag", label: "Under Warranty", type: "text" },
  { key: "branch", label: "Branch / Location", type: "text" },
  { key: "latitude", label: "Pickup Latitude", type: "text" },
  { key: "longitude", label: "Pickup Longitude", type: "text" },
  // --- Future-proofing fields (beyond AN-CRM's current CrmJobSheet shape) ---
  { key: "imeiOrSerialNumber", label: "IMEI / Serial Number", type: "text" },
  { key: "faultDescription", label: "Fault in Device", type: "text" },
  { key: "remark", label: "Remark", type: "text" },
  { key: "deviceAppearance", label: "Appearance", type: "select-chip" },
  { key: "fileBackupDescription", label: "File Backup Done", type: "text" },
  { key: "warrantyStatus", label: "Warranty Type", type: "select-chip" },
  { key: "appointmentType", label: "Appointment Type", type: "select-chip" },
  { key: "requestType", label: "Request Type", type: "select-chip" },
  { key: "warrantyExpiryDate", label: "Warranty Expiry Date", type: "date" },
  { key: "slaDate", label: "Promised Delivery (SLA)", type: "date" },
  { key: "estimatedCost", label: "Estimated Cost", type: "currency" },
  { key: "actualCost", label: "Actual Cost", type: "currency" },
];

export const serviceCentreRows: Row[] = [
  {
    id: "WO-2291",
    customer: "Ravi Shankar",
    device: "Samsung Galaxy S23",
    technician: "Suresh M.",
    priority: "High",
    status: "In repair",
    receivedDate: "2026-08-05",
    estimatedAmount: 3200,
    warrantyFlag: false,
    branch: "Koramangala",
    latitude: 12.9352,
    longitude: 77.6146,
  },
  {
    id: "WO-2290",
    customer: "Priya Nair",
    device: "Dell Inspiron 15 3520",
    technician: "Arjun K.",
    priority: "Medium",
    status: "Ready",
    receivedDate: "2026-08-04",
    estimatedAmount: 1450,
    warrantyFlag: true,
    branch: "Indiranagar",
    latitude: 12.9719,
    longitude: 77.6412,
  },
  {
    id: "WO-2289",
    customer: "Faisal Ahmed",
    device: "LG GL-T292RPZY Double Door",
    technician: "Suresh M.",
    priority: "Urgent",
    status: "Diagnosed",
    receivedDate: "2026-08-06",
    estimatedAmount: 5600,
    warrantyFlag: false,
    branch: "Koramangala",
    latitude: 12.9352,
    longitude: 77.6146,
  },
  {
    id: "WO-2288",
    customer: "Divya Menon",
    device: "Sony Bravia X75L 55\"",
    technician: "Neha P.",
    priority: "Low",
    status: "Delivered",
    receivedDate: "2026-08-01",
    estimatedAmount: 900,
    warrantyFlag: true,
    branch: "HSR Layout",
    latitude: 12.9121,
    longitude: 77.6446,
  },
];

/**
 * Workorder intake form. Grouped into the same four sections the AN-CRM
 * reference app's own job-sheet intake screen uses — Customer / Address /
 * Device / Issue — with this app's own extra operational fields following
 * in two further sections rather than interleaved with them.
 *
 * Required-ness matches the reference app's server-side create validation
 * (api/crm/jobsheets POST): customer name, phone, address, city, state,
 * pincode and the fault description are all rejected server-side when
 * blank there, and IMEI/serial + "logged by" are enforced at intake.
 *
 * `createHidden` marks the fields that must NOT appear at intake, so the
 * create form is the same 18-input screen the reference app's own intake
 * is rather than a 42-input wall. Three reasons a field carries it:
 *   - the system sets it at creation (Job ID from the numbering scheme,
 *     Status = "Created", Received Date = createdAt);
 *   - a later lifecycle stage sets it (estimate/actual cost, SLA date,
 *     customer approval timestamp, before/after photos, notes) — these
 *     stay on the EDIT form and on the workorder's own lifecycle panel,
 *     nothing is dropped;
 *   - it's dispatch/routing metadata this module captures after intake
 *     (priority, branch, appointment/request type, pickup lat/long).
 * Nothing is removed from the model: every one of them is still editable
 * from the workorder's edit page, which renders the full field set.
 */
export const serviceCentreFormFields: FormFieldDef[] = [
  // --- Customer intake block ---
  // Phone is first and drives the returning-customer lookup on the create
  // page (see serviceCentreCustomerLookup.ts) — the same "type a number,
  // the rest fills itself in" behaviour as the reference intake screen,
  // with every prefilled field left fully editable afterwards.
  { section: "Customer", column: 1, key: "customerPhone", label: "Contact No", type: "phone", required: true, placeholder: "Type to prefill a returning customer" },
  { section: "Customer", column: 1, key: "customer", label: "Customer Name", type: "relation", required: true, placeholder: "Fills in automatically if the number matches, or type it in" },
  // Not on the reference app's intake screen at all — a returning
  // customer's email still prefills from Contacts, and it stays editable
  // on the workorder's edit page.
  { section: "Customer", column: 1, key: "customerEmail", label: "Customer Email", type: "email", required: false, createHidden: true },
  { section: "Customer", column: 1, key: "customerCompany", label: "Company (B2B customer)", type: "text", required: false },
  { section: "Customer", column: 1, key: "customerGstin", label: "Customer GSTIN", type: "text", required: false, placeholder: "22AAAAA0000A1Z5 — leave blank for a B2C job" },

  // The address block is required because the printed invoice and any B2B
  // GST document are unusable without it — and because the place of supply
  // (customer state vs. the service centre's own) is what decides whether
  // the invoice splits tax as CGST+SGST or charges IGST.
  //
  // Pincode/State/City are wired to the shared pincode resolution
  // (addressRole, see RecordForm + lib/geo/pincodeClient — the same
  // /api/pincode path the signup form uses): typing a 6-digit pincode
  // fills State and City. State is a fixed INDIAN_STATES select either
  // way, so the stored value is always a canonical state name — the
  // invoice's CGST+SGST vs IGST split is decided by comparing it against
  // the service centre's own state and can't be left to free text.
  { section: "Address", column: 1, key: "customerAddress", label: "Address", type: "textarea", required: true },
  { section: "Address", column: 1, key: "customerPincode", label: "Pincode", type: "text", required: true, placeholder: "400001", addressRole: "pincode" },
  { section: "Address", column: 1, key: "customerState", label: "State", type: "text", required: true, addressRole: "state" },
  { section: "Address", column: 1, key: "customerCity", label: "City", type: "text", required: true, addressRole: "city" },

  // --- Device ---
  { section: "Device", column: 2, key: "deviceCategory", label: "Device / Vehicle Type", type: "select", required: true, options: ALL_CATEGORY_OPTIONS, optionLabels: ALL_CATEGORY_LABELS, optionGroups: ALL_CATEGORY_GROUPS },
  // Brand/Model are free text backed by this partner's own catalog as
  // suggestions, never a closed dropdown: a device that isn't catalogued
  // yet must never block a walk-in from being booked in. The create page
  // fills `suggestions` from the live Brands/Models records and the
  // "+ Add new" links point at those modules' own create pages, which is
  // this app's equivalent of the reference screen's add-and-save modal.
  // Model is scoped to the selected Brand (parentKey) — the create page
  // supplies the brand -> models map, and changing Brand clears Model,
  // matching the reference app's savedModelsByBrand behaviour.
  { section: "Device", column: 2, key: "brandName", label: "Brand", type: "text", required: false, placeholder: "e.g. Samsung — pick a saved brand or type a new one" },
  { section: "Device", column: 2, key: "modelName", label: "Model", type: "text", required: false, placeholder: "e.g. Galaxy M14 — pick a saved model or type a new one", parentKey: "brandName" },
  { section: "Device", column: 2, key: "imeiOrSerialNumber", label: "IMEI / Serial Number", type: "text", required: true, placeholder: "15-digit IMEI for a phone/tablet, otherwise the manufacturer serial number" },
  { section: "Device", column: 2, key: "deviceAppearance", label: "Appearance", type: "select", required: false, options: [...DEVICE_APPEARANCE_OPTIONS], optionLabels: DEVICE_APPEARANCE_LABELS },
  { section: "Device", column: 2, key: "fileBackupDescription", label: "File Backup Done", type: "select", required: false, options: [...FILE_BACKUP_OPTIONS], optionLabels: FILE_BACKUP_LABELS },
  { section: "Device", column: 2, key: "warrantyStatus", label: "Warranty Type", type: "select", required: false, options: [...WARRANTY_STATUSES], optionLabels: WARRANTY_STATUS_LABELS, help: "In-warranty and 90-day jobs are non-chargeable — their invoice lines bill at zero." },
  // Brand + Model + IMEI already identify the unit at intake; these two are
  // post-intake detail (the reference screen has neither).
  { section: "Device", column: 2, key: "device", label: "Device (free text)", type: "text", required: false, placeholder: "Optional one-line description when Brand/Model don't capture it", createHidden: true },
  { section: "Device", column: 2, key: "standardAccessories", label: "Standard Accessories Received", type: "textarea", required: false, createHidden: true },

  // --- Issue ---
  { section: "Issue", column: 2, key: "faultDescription", label: "Fault in Device", type: "textarea", required: true, placeholder: "What's actually wrong — this is the job's title on every list and printed document" },
  // Duplicates Fault in Device at intake; kept for the diagnosis stage.
  { section: "Issue", column: 2, key: "issueDescription", label: "Issue Description (customer's own words)", type: "textarea", required: false, createHidden: true },
  { section: "Issue", column: 2, key: "remark", label: "Remark", type: "text", required: false },
  // Free text, not a picker: the technician roster (PartnerStaff) is the
  // roster of people who REPAIR, while this records the front-desk person
  // who took the job in — often not on that roster at all. The reference
  // app makes the same call for its equivalent `ccoName` field, offering
  // recently-used names as suggestions rather than a fixed list.
  { section: "Issue", column: 2, key: "loggedBy", label: "Logged By (CCO Name)", type: "text", required: true, placeholder: "Select a recent name or type a new one" },

  // --- Job handling (this app's own operational fields) ---
  // Every field below is createHidden: the system sets it at creation, or a
  // later lifecycle stage does. They all remain on the edit form.
  //
  // Job ID is no longer typed by hand at all — createServiceCentreWorkorderAction
  // pulls it from the "service-centre.workorder" numbering scheme (the same
  // NumberingMainScheme/NumberingPartnerScheme/NumberingCounter mechanism the
  // invoice numbers use), so it's never `required` either.
  { section: "Job handling", column: 1, key: "id", label: "Job ID", type: "text", required: false, createHidden: true, help: "Assigned automatically from this partner's workorder numbering scheme." },
  { section: "Job handling", column: 1, key: "priority", label: "Priority", type: "select", required: false, options: ["Low","Medium","High","Urgent"], createHidden: true },
  // Set to "Created" server-side at intake; advanced by the lifecycle panel.
  { section: "Job handling", column: 1, key: "status", label: "Status", type: "select", required: false, options: ["Diagnosed","In repair","Ready","Delivered","On hold"], createHidden: true },
  // Stamped with the intake time server-side (the record's createdAt).
  { section: "Job handling", column: 1, key: "receivedDate", label: "Received Date", type: "date", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "appointmentType", label: "Appointment Type", type: "select", required: false, options: [...APPOINTMENT_TYPES], optionLabels: APPOINTMENT_TYPE_LABELS, createHidden: true },
  { section: "Job handling", column: 1, key: "requestType", label: "Request Type", type: "select", required: false, options: [...REQUEST_TYPES], optionLabels: REQUEST_TYPE_LABELS, createHidden: true },
  { section: "Job handling", column: 1, key: "branch", label: "Branch / Location", type: "text", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "warrantyFlag", label: "Under Warranty", type: "boolean", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "warrantyExpiryDate", label: "Warranty Expiry Date", type: "date", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "slaDate", label: "Promised Delivery (SLA)", type: "date", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "estimatedAmount", label: "Estimated Amount", type: "currency", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "estimatedCost", label: "Estimated Cost", type: "currency", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "actualCost", label: "Actual Cost", type: "currency", required: false, createHidden: true },
  // Pickup coordinates are captured when a pickup is actually scheduled, not
  // at counter intake (the reference job sheet has no equivalent at intake).
  { section: "Job handling", column: 1, key: "latitude", label: "Pickup Latitude", type: "number", required: false, createHidden: true },
  { section: "Job handling", column: 1, key: "longitude", label: "Pickup Longitude", type: "number", required: false, createHidden: true },

  // --- Notes & attachments (all post-intake) ---
  { section: "Notes & attachments", column: 2, key: "customerApprovalAt", label: "Customer Approval Timestamp", type: "text", required: false, placeholder: "Set automatically when the estimate is approved", createHidden: true },
  { section: "Notes & attachments", column: 2, key: "beforePhotos", label: "Before Photos (URLs, comma-separated)", type: "textarea", required: false, createHidden: true },
  { section: "Notes & attachments", column: 2, key: "afterPhotos", label: "After Photos (URLs, comma-separated)", type: "textarea", required: false, createHidden: true },
  { section: "Notes & attachments", column: 2, key: "internalNotes", label: "Internal Notes (staff-only)", type: "textarea", required: false, createHidden: true },
  { section: "Notes & attachments", column: 2, key: "customerNotes", label: "Customer-visible Notes", type: "textarea", required: false, createHidden: true },
];

export function getServiceCentreRecord(recordId: string): Row {
  return serviceCentreRows.find((r) => String(r["id"]) === recordId) ?? serviceCentreRows[0];
}

export function getServiceCentreDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Job ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    { label: "Customer Phone", value: r["customerPhone"], type: "phone" },
    { label: "Customer Email", value: r["customerEmail"], type: "text" },
    { label: "Company", value: r["customerCompany"], type: "text" },
    { label: "Customer GSTIN", value: r["customerGstin"], type: "text" },
    { label: "Address", value: r["customerAddress"], type: "text" },
    { label: "City", value: r["customerCity"], type: "text" },
    { label: "State", value: r["customerState"], type: "text" },
    { label: "Pincode", value: r["customerPincode"], type: "text" },
    { label: "Logged By", value: r["loggedBy"], type: "text" },
    // Both taxonomies, so a vehicle job's class renders as a label too.
    { label: "Device / Vehicle Type", value: ALL_CATEGORY_LABELS[String(r["deviceCategory"])] ?? r["deviceCategory"], type: "text" },
    { label: "Device", value: r["device"], type: "text" },
    { label: "Brand", value: r["brandName"], type: "text" },
    { label: "Model", value: r["modelName"], type: "text" },
    { label: "Assigned Technician", value: r["technicianName"], type: "text" },
    { label: "Priority", value: r["priority"], type: "select", chipVariant: STATUS_VARIANT[String(r["priority"])] ?? "neutral" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Received Date", value: r["receivedDate"], type: "date" },
    { label: "Estimated Amount", value: r["estimatedAmount"], type: "currency" },
    { label: "Under Warranty", value: r["warrantyFlag"], type: "boolean" },
    { label: "Branch / Location", value: r["branch"], type: "text" },
    { label: "Pickup Latitude", value: r["latitude"], type: "text" },
    { label: "Pickup Longitude", value: r["longitude"], type: "text" },
    { label: "IMEI / Serial Number", value: r["imeiOrSerialNumber"], type: "text" },
    { label: "Appointment Type", value: APPOINTMENT_TYPE_LABELS[String(r["appointmentType"])] ?? r["appointmentType"], type: "text" },
    { label: "Request Type", value: REQUEST_TYPE_LABELS[String(r["requestType"])] ?? r["requestType"], type: "text" },
    { label: "Appearance", value: DEVICE_APPEARANCE_LABELS[String(r["deviceAppearance"])] ?? r["deviceAppearance"], type: "text" },
    { label: "File Backup Done", value: FILE_BACKUP_LABELS[String(r["fileBackupDescription"])] ?? r["fileBackupDescription"], type: "text" },
    { label: "Warranty Type", value: WARRANTY_STATUS_LABELS[String(r["warrantyStatus"])] ?? r["warrantyStatus"], type: "text" },
    { label: "Warranty Expiry Date", value: r["warrantyExpiryDate"], type: "date" },
    { label: "Promised Delivery (SLA)", value: r["slaDate"], type: "date" },
    { label: "Estimated Cost", value: r["estimatedCost"], type: "currency" },
    { label: "Actual Cost", value: r["actualCost"], type: "currency" },
    { label: "Fault in Device", value: r["faultDescription"], type: "text" },
    { label: "Issue Description", value: r["issueDescription"], type: "text" },
    { label: "Remark", value: r["remark"], type: "text" },
    { label: "Standard Accessories Received", value: r["standardAccessories"], type: "text" },
    { label: "Internal Notes", value: r["internalNotes"], type: "text" },
    { label: "Customer-visible Notes", value: r["customerNotes"], type: "text" },
  ];
}

/**
 * Real activity timeline for a workorder, derived ENTIRELY from timestamps
 * already persisted on the record itself — intake date, the stageHistory
 * entries appended by patchServiceCentreWorkorderAction on every stage
 * change, technician assignment, estimate approval, hold, and cancellation.
 *
 * Deliberately carries NO `actor` and no IP address: Service Centre has a
 * single login for the whole business (see requirePartnerSession.ts /
 * assertCanActOnServiceCentre), so there is no per-action user identity to
 * attribute an entry to. This function previously returned four hardcoded
 * entries with invented staff names and invented IP addresses, identical
 * for every workorder — a fabricated audit trail on a printable document.
 * Anything that can't be backed by real stored data is omitted rather than
 * invented.
 */
export function getServiceCentreTimeline(record: Row): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const push = (id: string, label: string, timestamp: unknown) => {
    if (typeof timestamp !== "string" || !timestamp.trim()) return;
    entries.push({ id, label, timestamp });
  };

  push("received", "Workorder created at intake", record["receivedDate"]);

  const history = (record["stageHistory"] as StageHistoryEntry[] | undefined) ?? [];
  history.forEach((h, i) => {
    if (!h || typeof h.at !== "string") return;
    push(`stage-${i}`, `Stage changed to ${h.stage}`, h.at);
  });

  if (record["technicianName"]) {
    push("assigned", `Technician assigned — ${String(record["technicianName"])}`, record["assignedAt"]);
  }
  if (record["estimateApproved"]) {
    push("estimate", "Estimate approved by customer", record["customerApprovalAt"]);
  }
  if (record["onHold"]) {
    const reason = record["holdReason"] ? ` — ${String(record["holdReason"])}` : "";
    push("hold", `Put on hold${reason}`, record["holdSince"]);
  }
  if (record["cancelledAt"]) {
    const reason = record["cancelReason"] ? ` — ${String(record["cancelReason"])}` : "";
    push("cancelled", `Workorder cancelled${reason}`, record["cancelledAt"]);
  }
  if (record["paymentCollectedAt"]) {
    const mode = record["paymentMode"] ? ` via ${String(record["paymentMode"])}` : "";
    push("payment", `Payment collected${mode}`, record["paymentCollectedAt"]);
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export const serviceCentreRelated: RelatedRecord[] = [];
