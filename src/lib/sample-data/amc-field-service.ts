import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Contract sample data for the amc-field-service module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Scheduled": "teal",
  "Technician en route": "warning",
  "Checked in": "amber",
  "Completed": "success",
  "Overdue": "danger"
};

export const amcFieldServiceColumns: Column[] = [
  { key: "id", label: "Contract ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "equipment", label: "Equipment", type: "text" },
  { key: "technician", label: "Technician", type: "text" },
  { key: "scheduledDate", label: "Scheduled Date", type: "date" },
  { key: "contractValue", label: "Contract Value", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "checkInLatitude", label: "Technician Check-in Latitude", type: "text" },
  { key: "checkInLongitude", label: "Technician Check-in Longitude", type: "text" },
];

export const amcFieldServiceRows: Row[] = [
  {
    id: "AMC-0871",
    customer: "Greenfield Apartments",
    equipment: "Central AC Chiller Unit 3",
    technician: "Vikram S.",
    scheduledDate: "2026-08-08",
    contractValue: 84000,
    status: "Scheduled",
    checkInLatitude: null,
    checkInLongitude: null,
  },
  {
    id: "AMC-0870",
    customer: "Om Sai Textiles",
    equipment: "Industrial Generator 250kVA",
    technician: "Ramesh N.",
    scheduledDate: "2026-08-06",
    contractValue: 120000,
    status: "Completed",
    checkInLatitude: 19.076,
    checkInLongitude: 72.8777,
  },
  {
    id: "AMC-0869",
    customer: "Lakeview Mall",
    equipment: "Escalator Bank — Wing B",
    technician: "Vikram S.",
    scheduledDate: "2026-08-07",
    contractValue: 65000,
    status: "Checked in",
    checkInLatitude: 12.9611,
    checkInLongitude: 77.6387,
  },
  {
    id: "AMC-0868",
    customer: "Radiant Hospital",
    equipment: "Backup UPS Bank",
    technician: "Sana K.",
    scheduledDate: "2026-08-04",
    contractValue: 98000,
    status: "Overdue",
    checkInLatitude: null,
    checkInLongitude: null,
  },
];

export const amcFieldServiceFormFields: FormFieldDef[] = [
  { key: "id", label: "Contract ID", type: "text", required: true },
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "equipment", label: "Equipment", type: "text", required: true },
  { key: "technician", label: "Technician", type: "text", required: true },
  { key: "scheduledDate", label: "Scheduled Date", type: "date", required: true },
  { key: "contractValue", label: "Contract Value", type: "currency", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Scheduled","Technician en route","Checked in","Completed","Overdue"] },
  { key: "checkInLatitude", label: "Technician Check-in Latitude", type: "number", required: false },
  { key: "checkInLongitude", label: "Technician Check-in Longitude", type: "number", required: false },
];

export function getAmcFieldServiceRecord(recordId: string): Row {
  return amcFieldServiceRows.find((r) => String(r["id"]) === recordId) ?? amcFieldServiceRows[0];
}

export function getAmcFieldServiceDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Contract ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    { label: "Equipment", value: r["equipment"], type: "text" },
    { label: "Technician", value: r["technician"], type: "text" },
    { label: "Scheduled Date", value: r["scheduledDate"], type: "date" },
    { label: "Contract Value", value: r["contractValue"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Technician Check-in Latitude", value: r["checkInLatitude"], type: "text" },
    { label: "Technician Check-in Longitude", value: r["checkInLongitude"], type: "text" },
  ];
}

export function getAmcFieldServiceTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["scheduledDate"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const amcFieldServiceRelated: RelatedRecord[] = [];
