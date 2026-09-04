import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Contract sample data for the amc-field-service module. A contract carries
// its own SLA (response-time, in hours) and end date; whether it's SLA-breached
// or renewal-due is never stored — both are computed server-side at read time
// from serviceRequestRaisedAt/technicianId and contractEndDate (see
// computeSlaBreach / computeRenewalDue below), so the badge can never go stale.

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

export const amcFieldServiceRows: Row[] = [
  {
    id: "AMC-0871",
    customer: "Greenfield Apartments",
    equipment: "Central AC Chiller Unit 3",
    contractStartDate: "2026-02-08",
    contractEndDate: "2026-09-20",
    renewalTermMonths: 12,
    slaHours: 24,
    serviceRequestRaisedAt: "2026-09-03T09:00:00",
    technicianId: undefined,
    technicianName: undefined,
    assignedAt: undefined,
    contractValue: 84000,
    status: "Scheduled",
    contractStatus: "Active",
    checkInLatitude: null,
    checkInLongitude: null,
  },
  {
    id: "AMC-0870",
    customer: "Om Sai Textiles",
    equipment: "Industrial Generator 250kVA",
    contractStartDate: "2025-08-06",
    contractEndDate: "2026-08-06",
    renewalTermMonths: 12,
    slaHours: 48,
    serviceRequestRaisedAt: undefined,
    technicianId: "USR-RAMESH",
    technicianName: "Ramesh N.",
    assignedAt: "2026-07-25T14:30:00",
    contractValue: 120000,
    status: "Completed",
    contractStatus: "Active",
    checkInLatitude: 19.076,
    checkInLongitude: 72.8777,
  },
  {
    id: "AMC-0869",
    customer: "Lakeview Mall",
    equipment: "Escalator Bank — Wing B",
    contractStartDate: "2026-02-07",
    contractEndDate: "2027-02-07",
    renewalTermMonths: 12,
    slaHours: 12,
    serviceRequestRaisedAt: "2026-08-07T05:00:00",
    technicianId: "USR-VIKRAM",
    technicianName: "Vikram S.",
    assignedAt: "2026-08-07T09:00:00",
    contractValue: 65000,
    status: "Checked in",
    contractStatus: "Active",
    checkInLatitude: 12.9611,
    checkInLongitude: 77.6387,
  },
  {
    id: "AMC-0868",
    customer: "Radiant Hospital",
    equipment: "Backup UPS Bank",
    contractStartDate: "2025-08-04",
    contractEndDate: "2026-08-04",
    renewalTermMonths: 12,
    slaHours: 6,
    serviceRequestRaisedAt: "2026-08-04T02:00:00",
    technicianId: undefined,
    technicianName: undefined,
    assignedAt: undefined,
    contractValue: 98000,
    status: "Overdue",
    contractStatus: "Active",
    checkInLatitude: null,
    checkInLongitude: null,
  },
];

export const amcFieldServiceFormFields: FormFieldDef[] = [
  { key: "id", label: "Contract ID", type: "text", required: true },
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "equipment", label: "Equipment", type: "text", required: true },
  { key: "contractStartDate", label: "Contract Start Date", type: "date", required: true },
  { key: "contractEndDate", label: "Contract End Date", type: "date", required: true },
  { key: "renewalTermMonths", label: "Renewal Term (months)", type: "number", required: false },
  { key: "slaHours", label: "SLA — Response Time (hours)", type: "number", required: true },
  { key: "contractValue", label: "Contract Value", type: "currency", required: false },
  { key: "status", label: "Service Status", type: "select", required: true, options: ["Scheduled", "Technician en route", "Checked in", "Completed", "Overdue"] },
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

/** Normalized view of a contract's dispatch/SLA/renewal-relevant fields, read off the raw record. */
export type AmcContractLifecycle = {
  contractStatus: ContractStatus;
  serviceStatus: string;
  slaHours: number;
  contractEndDate?: string;
  renewalTermMonths: number;
  serviceRequestRaisedAt?: string;
  technicianId?: string;
  technicianName?: string;
  assignedAt?: string;
  renewedFromId?: string;
  renewedToId?: string;
};

export function extractAmcLifecycleFromRecord(record: Row): AmcContractLifecycle {
  return {
    contractStatus: (record["contractStatus"] as ContractStatus) ?? "Active",
    serviceStatus: String(record["status"] ?? "Scheduled"),
    slaHours: Number(record["slaHours"] ?? 24),
    contractEndDate: record["contractEndDate"] ? String(record["contractEndDate"]) : undefined,
    renewalTermMonths: Number(record["renewalTermMonths"] ?? 12),
    serviceRequestRaisedAt: record["serviceRequestRaisedAt"] ? String(record["serviceRequestRaisedAt"]) : undefined,
    technicianId: record["technicianId"] ? String(record["technicianId"]) : undefined,
    technicianName: record["technicianName"] ? String(record["technicianName"]) : undefined,
    assignedAt: record["assignedAt"] ? String(record["assignedAt"]) : undefined,
    renewedFromId: record["renewedFromId"] ? String(record["renewedFromId"]) : undefined,
    renewedToId: record["renewedToId"] ? String(record["renewedToId"]) : undefined,
  };
}

/**
 * SLA breached: there's an open service request (raised, not yet resolved)
 * that has had no technician dispatched for longer than the contract's SLA
 * response-time window. Always computed against `now` at call time — never
 * persisted, so it can't go stale.
 */
export function computeSlaBreach(lifecycle: AmcContractLifecycle, now: Date = new Date()): boolean {
  if (!lifecycle.serviceRequestRaisedAt || lifecycle.technicianId) return false;
  const raised = new Date(lifecycle.serviceRequestRaisedAt).getTime();
  if (Number.isNaN(raised)) return false;
  const hoursSince = (now.getTime() - raised) / (1000 * 60 * 60);
  return hoursSince > lifecycle.slaHours;
}

/** Renewal due: contract is Active and its end date falls within the next 30 days (or has already passed). */
export function computeRenewalDue(lifecycle: AmcContractLifecycle, now: Date = new Date()): boolean {
  if (lifecycle.contractStatus !== "Active" || !lifecycle.contractEndDate) return false;
  const end = new Date(lifecycle.contractEndDate).getTime();
  if (Number.isNaN(end)) return false;
  const daysUntil = (end - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 30;
}
