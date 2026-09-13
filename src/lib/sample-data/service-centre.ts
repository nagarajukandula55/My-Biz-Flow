import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Workorder (JobSheet) sample data for the service-centre module — realistic
// field modeling, no backend wired up in this pass beyond the BusinessRecord
// store (see CLAUDE.md).
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

export function mapStageToMilestone(stage: WorkorderStage, onHold?: boolean): MilestoneStatus {
  if (stage === "In Progress" && onHold) return "PART_PENDING";
  switch (stage) {
    case "Created": return "CREATED";
    case "In Progress": return "REPAIR_IN_PROGRESS";
    case "Completed": return "REPAIR_COMPLETED";
    case "Closed": return "CLOSED";
    default: return "CREATED";
  }
}

export const WARRANTY_STATUSES = ["IW", "OOW", "90_DAYS"] as const;
export const APPOINTMENT_TYPES = ["Walk-in", "Onsite", "Phone", "Online", "Referral"] as const;
export const DEVICE_APPEARANCE_OPTIONS = ["Good", "Used", "Dents", "Broken"] as const;
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
    brandName: "Honda",
    modelName: "Activa 6G",
    partLines: [
      { id: "PL-1", materialId: "MAT-1001", materialLabel: "MAT-1001 — Front Brake Pad Set", qty: 1, serialized: false },
    ],
    serviceLines: [{ id: "SL-1", solutionId: "SOL-002", solutionLabel: "Battery replacement", laborCharge: 150 }],
  },
  "WO-2290": {
    stage: "Completed",
    brandName: "TVS",
    modelName: "Jupiter",
    partLines: [],
    serviceLines: [{ id: "SL-1", solutionId: "SOL-004", solutionLabel: "General service / cleaning", laborCharge: 200 }],
  },
  "WO-2289": {
    stage: "Created",
    brandName: "Royal Enfield",
    modelName: "Classic 350",
    partLines: [],
    serviceLines: [],
  },
  "WO-2288": {
    stage: "Closed",
    brandName: "Bajaj",
    modelName: "Chetak EV",
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
  };
}


export const serviceCentreColumns: Column[] = [
  { key: "id", label: "Job ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "device", label: "Device / Vehicle", type: "text" },
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
  { key: "odometerReading", label: "Odometer Reading", type: "text" },
  { key: "appointmentType", label: "Source Channel", type: "select-chip" },
  { key: "warrantyExpiryDate", label: "Warranty Expiry Date", type: "date" },
  { key: "slaDate", label: "Promised Delivery (SLA)", type: "date" },
  { key: "estimatedCost", label: "Estimated Cost", type: "currency" },
  { key: "actualCost", label: "Actual Cost", type: "currency" },
];

export const serviceCentreRows: Row[] = [
  {
    id: "WO-2291",
    customer: "Ravi Shankar",
    device: "Honda Activa 6G",
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
    device: "TVS Jupiter",
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
    device: "Royal Enfield Classic 350",
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
    device: "Bajaj Chetak EV",
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

export const serviceCentreFormFields: FormFieldDef[] = [
  { key: "id", label: "Job ID", type: "text", required: true },
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "device", label: "Device / Vehicle", type: "text", required: false, placeholder: "Free-text fallback — pick a real Brand/Model from the job's detail page once created" },
  { key: "priority", label: "Priority", type: "select", required: true, options: ["Low","Medium","High","Urgent"] },
  { key: "status", label: "Status", type: "select", required: true, options: ["Diagnosed","In repair","Ready","Delivered","On hold"] },
  { key: "receivedDate", label: "Received Date", type: "date", required: true },
  { key: "estimatedAmount", label: "Estimated Amount", type: "currency", required: false },
  { key: "warrantyFlag", label: "Under Warranty", type: "boolean", required: false },
  { key: "branch", label: "Branch / Location", type: "text", required: false },
  { key: "latitude", label: "Pickup Latitude", type: "number", required: false },
  { key: "longitude", label: "Pickup Longitude", type: "number", required: false },
  // --- Future-proofing fields — all optional, defaulted so existing sample rows keep working unmodified ---
  { key: "imeiOrSerialNumber", label: "IMEI / Serial Number", type: "text", required: false, placeholder: "Device IMEI, serial number, or odometer-tracked vehicle VIN" },
  { key: "odometerReading", label: "Odometer Reading", type: "text", required: false, placeholder: "For vehicle service — e.g. 18420 km" },
  { key: "appointmentType", label: "Source Channel", type: "select", required: false, options: [...APPOINTMENT_TYPES] },
  { key: "deviceAppearance", label: "Intake Condition", type: "select", required: false, options: [...DEVICE_APPEARANCE_OPTIONS] },
  { key: "warrantyStatus", label: "Warranty Status", type: "select", required: false, options: [...WARRANTY_STATUSES] },
  { key: "warrantyExpiryDate", label: "Warranty Expiry Date", type: "date", required: false },
  { key: "slaDate", label: "Promised Delivery (SLA)", type: "date", required: false },
  { key: "estimatedCost", label: "Estimated Cost", type: "currency", required: false },
  { key: "actualCost", label: "Actual Cost", type: "currency", required: false },
  { key: "customerApprovalAt", label: "Customer Approval Timestamp", type: "text", required: false, placeholder: "Set automatically when the estimate is approved" },
  { key: "beforePhotos", label: "Before Photos (URLs, comma-separated)", type: "textarea", required: false },
  { key: "afterPhotos", label: "After Photos (URLs, comma-separated)", type: "textarea", required: false },
  { key: "internalNotes", label: "Internal Notes (staff-only)", type: "textarea", required: false },
  { key: "customerNotes", label: "Customer-visible Notes", type: "textarea", required: false },
  { key: "standardAccessories", label: "Standard Accessories Received", type: "textarea", required: false },
  { key: "fileBackupDescription", label: "File Backup Notes", type: "textarea", required: false },
  { key: "issueDescription", label: "Issue Description (customer's own words)", type: "textarea", required: false },
];

export function getServiceCentreRecord(recordId: string): Row {
  return serviceCentreRows.find((r) => String(r["id"]) === recordId) ?? serviceCentreRows[0];
}

export function getServiceCentreDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Job ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    { label: "Device / Vehicle", value: r["device"], type: "text" },
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
    { label: "Odometer Reading", value: r["odometerReading"], type: "text" },
    { label: "Source Channel", value: r["appointmentType"], type: "text" },
    { label: "Intake Condition", value: r["deviceAppearance"], type: "text" },
    { label: "Warranty Status", value: r["warrantyStatus"], type: "text" },
    { label: "Warranty Expiry Date", value: r["warrantyExpiryDate"], type: "date" },
    { label: "Promised Delivery (SLA)", value: r["slaDate"], type: "date" },
    { label: "Estimated Cost", value: r["estimatedCost"], type: "currency" },
    { label: "Actual Cost", value: r["actualCost"], type: "currency" },
    { label: "Issue Description", value: r["issueDescription"], type: "text" },
    { label: "Internal Notes", value: r["internalNotes"], type: "text" },
    { label: "Customer-visible Notes", value: r["customerNotes"], type: "text" },
  ];
}

export function getServiceCentreTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Job created at intake counter by Suresh M. — IP 103.21.44.18", timestamp: "2026-08-03T09:30:00", actor: "Suresh M." },
    { id: "t2", label: "Device diagnosed and estimate shared with customer by Technician — IP 103.21.44.18", timestamp: "2026-08-04T11:00:00", actor: "Technician" },
    { id: "t3", label: "Technician checked in for pickup on-site (12.9352, 77.6146) — IP 103.21.44.30", timestamp: "2026-08-05T10:15:00", actor: "Field Technician" },
    { id: "t4", label: "Status changed to Ready by Suresh M. — IP 103.21.44.18", timestamp: "2026-08-06T16:40:00", actor: "Suresh M." },
  ];
}

export const serviceCentreRelated: RelatedRecord[] = [];
