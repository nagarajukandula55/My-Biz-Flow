import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Workorder sample data for the service-centre module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Diagnosed": "warning",
  "In repair": "amber",
  "Ready": "teal",
  "Delivered": "success",
  "On hold": "danger"
};

/** Single-page workorder lifecycle stages — see WorkorderLifecycle.tsx. */
export type WorkorderStage = "Created" | "In Progress" | "Completed" | "Closed";
export const WORKORDER_STAGES: WorkorderStage[] = ["Created", "In Progress", "Completed", "Closed"];

export interface PartLine {
  id: string;
  materialId: string;
  materialLabel: string;
  qty: number;
  serialized: boolean;
  serial?: string;
  pending?: boolean;
  pendingReason?: string;
}

export interface ServiceLine {
  id: string;
  solutionId: string;
  solutionLabel: string;
  laborCharge: number;
}

/** Per-workorder lifecycle state, keyed by workorder id. Demo in-memory store — resets on reload, no backend yet. */
export const workorderLifecycle: Record<
  string,
  {
    stage: WorkorderStage;
    brandName?: string;
    modelName?: string;
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
  brandName?: string;
  modelName?: string;
  partLines: PartLine[];
  serviceLines: ServiceLine[];
  handoverNotes?: string;
} {
  return {
    stage: (record["stage"] as WorkorderStage | undefined) ?? "Created",
    brandName: record["brandName"] as string | undefined,
    modelName: record["modelName"] as string | undefined,
    partLines: (record["partLines"] as PartLine[] | undefined) ?? [],
    serviceLines: (record["serviceLines"] as ServiceLine[] | undefined) ?? [],
    handoverNotes: record["handoverNotes"] as string | undefined,
  };
}


export const serviceCentreColumns: Column[] = [
  { key: "id", label: "Job ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "device", label: "Device / Vehicle", type: "text" },
  { key: "technician", label: "Technician", type: "text" },
  { key: "priority", label: "Priority", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "receivedDate", label: "Received Date", type: "date" },
  { key: "estimatedAmount", label: "Estimated Amount", type: "currency" },
  { key: "warrantyFlag", label: "Under Warranty", type: "text" },
  { key: "branch", label: "Branch / Location", type: "text" },
  { key: "latitude", label: "Pickup Latitude", type: "text" },
  { key: "longitude", label: "Pickup Longitude", type: "text" },
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
  { key: "device", label: "Device / Vehicle", type: "text", required: true },
  { key: "technician", label: "Technician", type: "text", required: true },
  { key: "priority", label: "Priority", type: "select", required: true, options: ["Low","Medium","High","Urgent"] },
  { key: "status", label: "Status", type: "select", required: true, options: ["Diagnosed","In repair","Ready","Delivered","On hold"] },
  { key: "receivedDate", label: "Received Date", type: "date", required: true },
  { key: "estimatedAmount", label: "Estimated Amount", type: "currency", required: false },
  { key: "warrantyFlag", label: "Under Warranty", type: "boolean", required: false },
  { key: "branch", label: "Branch / Location", type: "text", required: false },
  { key: "latitude", label: "Pickup Latitude", type: "number", required: false },
  { key: "longitude", label: "Pickup Longitude", type: "number", required: false },
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
    { label: "Technician", value: r["technician"], type: "text" },
    { label: "Priority", value: r["priority"], type: "select", chipVariant: STATUS_VARIANT[String(r["priority"])] ?? "neutral" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Received Date", value: r["receivedDate"], type: "date" },
    { label: "Estimated Amount", value: r["estimatedAmount"], type: "currency" },
    { label: "Under Warranty", value: r["warrantyFlag"], type: "boolean" },
    { label: "Branch / Location", value: r["branch"], type: "text" },
    { label: "Pickup Latitude", value: r["latitude"], type: "text" },
    { label: "Pickup Longitude", value: r["longitude"], type: "text" },
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
