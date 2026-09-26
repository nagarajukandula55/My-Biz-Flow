import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// UI schema (columns/form fields) for the amc-field-service module — now
// Prisma-backed (AmcContract + ServiceVisit, see src/lib/amcContractsData.ts
// for the real data access, lifecycle extraction, and computeSlaBreach/
// computeRenewalDue, which moved there since they now read off a contract's
// joined serviceVisits rather than a BusinessRecord's flat fields). This
// file keeps only the presentational column/field defs plus the demo
// timeline used by RecordDetail — a contract carries its own SLA
// (response-time, in hours) and end date; whether it's SLA-breached or
// renewal-due is never stored on the contract itself.

export type ContractStatus = "Active" | "Renewed" | "Expired";
export type ServiceRequestStatus = "Scheduled" | "Technician en route" | "Checked in" | "Completed" | "Overdue";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Scheduled": "teal",
  "Technician en route": "warning",
  "Checked in": "amber",
  "Completed": "success",
  "Overdue": "danger",
};

const CONTRACT_STATUS_VARIANT: Record<ContractStatus, StatusVariant> = {
  Active: "success",
  Renewed: "neutral",
  Expired: "danger",
};

export const amcFieldServiceColumns: Column[] = [
  { key: "id", label: "Contract ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "equipment", label: "Equipment", type: "text" },
  { key: "technicianName", label: "Technician", type: "text" },
  { key: "contractEndDate", label: "Contract End Date", type: "date" },
  { key: "slaHours", label: "SLA (hrs)", type: "text" },
  { key: "contractValue", label: "Contract Value", type: "currency" },
  { key: "status", label: "Service Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "contractStatus", label: "Contract Status", type: "select-chip", chipVariantMap: CONTRACT_STATUS_VARIANT },
];

/**
 * Static demo fixture — kept only for src/lib/moduleData.ts's cross-module
 * MODULE_DATA registry (Type-wise dashboard / Analytics bar chart), which
 * needs a Row[] for every module generically. The real list/detail pages
 * read live AmcContract/ServiceVisit rows via amcContractsData.ts instead.
 */
export const amcFieldServiceRows: Row[] = [
  {
    id: "AMC-0871",
    customer: "Greenfield Apartments",
    equipment: "Central AC Chiller Unit 3",
    technicianName: undefined,
    contractEndDate: "2026-09-20",
    slaHours: 24,
    contractValue: 84000,
    status: "Scheduled",
    contractStatus: "Active",
  },
  {
    id: "AMC-0870",
    customer: "Om Sai Textiles",
    equipment: "Industrial Generator 250kVA",
    technicianName: "Ramesh N.",
    contractEndDate: "2026-08-06",
    slaHours: 48,
    contractValue: 120000,
    status: "Completed",
    contractStatus: "Active",
  },
];

/**
 * Contract-only fields — the AmcContract model itself. Service-visit fields
 * (service status, technician, check-in geo) now belong to ServiceVisit and
 * are captured via the AmcLifecycle panel / "Add Visit" form on the detail
 * page instead of this create/edit form — see
 * src/lib/amcContractsData.ts.
 */
export const amcFieldServiceFormFields: FormFieldDef[] = [
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "equipment", label: "Equipment", type: "text", required: true },
  { key: "contractStartDate", label: "Contract Start Date", type: "date", required: true },
  { key: "contractEndDate", label: "Contract End Date", type: "date", required: true },
  { key: "renewalTermMonths", label: "Renewal Term (months)", type: "number", required: false },
  { key: "slaHours", label: "SLA — Response Time (hours)", type: "number", required: true },
  { key: "contractValue", label: "Contract Value", type: "currency", required: false },
];

export function getAmcFieldServiceDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Contract ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    { label: "Equipment", value: r["equipment"], type: "text" },
    { label: "Contract Start Date", value: r["contractStartDate"], type: "date" },
    { label: "Contract End Date", value: r["contractEndDate"], type: "date" },
    { label: "SLA — Response Time (hours)", value: r["slaHours"], type: "text" },
    { label: "Contract Value", value: r["contractValue"], type: "currency" },
    { label: "Service Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    {
      label: "Contract Status",
      value: r["contractStatus"] ?? "Active",
      type: "select",
      chipVariant: CONTRACT_STATUS_VARIANT[(r["contractStatus"] as ContractStatus) ?? "Active"],
    },
    { label: "Technician Check-in Latitude", value: r["checkInLatitude"], type: "text" },
    { label: "Technician Check-in Longitude", value: r["checkInLongitude"], type: "text" },
  ];
}

export function getAmcFieldServiceTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Contract created by Ramesh (Ops Admin) — IP 103.21.44.20", timestamp: "2026-07-20T10:00:00", actor: "Ramesh" },
    { id: "t2", label: "Technician assigned and visit scheduled by Suresh M. — IP 103.21.44.18", timestamp: "2026-07-25T14:30:00", actor: "Suresh M." },
    { id: "t3", label: "Technician checked in on-site (12.9611, 77.6387) — IP 103.21.44.30", timestamp: "2026-08-06T09:15:00", actor: "Field Technician" },
    { id: "t4", label: "Service marked completed, contract value invoiced", timestamp: "2026-08-06T11:45:00", actor: "System" },
  ];
}

export const amcFieldServiceRelated: RelatedRecord[] = [];

// Lifecycle extraction (extractAmcLifecycle) and computeSlaBreach/
// computeRenewalDue now live in src/lib/amcContractsData.ts, since they read
// off a contract's joined serviceVisits (Prisma) rather than a flat
// BusinessRecord Row.
