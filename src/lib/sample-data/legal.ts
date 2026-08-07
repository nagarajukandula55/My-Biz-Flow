import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Matter sample data for the legal module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Open": "teal",
  "In discovery": "warning",
  "In trial": "amber",
  "Settled": "success",
  "Closed": "neutral"
};

export const legalColumns: Column[] = [
  { key: "id", label: "Matter ID", type: "text" },
  { key: "client", label: "Client", type: "relation-link" },
  { key: "caseType", label: "Case Type", type: "select-chip" },
  { key: "billableHours", label: "Billable Hours", type: "text" },
  { key: "hourlyRate", label: "Hourly Rate", type: "currency" },
  { key: "nextHearingDate", label: "Next Hearing Date", type: "date" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "assignedAttorney", label: "Assigned Attorney", type: "text" },
];

export const legalRows: Row[] = [
  {
    id: "MTR-1201",
    client: "Vasudev Constructions",
    caseType: "Corporate",
    billableHours: 42,
    hourlyRate: 4500,
    nextHearingDate: "2026-08-18",
    status: "In discovery",
    assignedAttorney: "Adv. Rekha Bhatt",
  },
  {
    id: "MTR-1200",
    client: "Priya Narayanan",
    caseType: "Family",
    billableHours: 18,
    hourlyRate: 3000,
    nextHearingDate: "2026-08-25",
    status: "Open",
    assignedAttorney: "Adv. Sameer Joshi",
  },
  {
    id: "MTR-1199",
    client: "Innovate Labs Pvt Ltd",
    caseType: "IP",
    billableHours: 60,
    hourlyRate: 6000,
    nextHearingDate: null,
    status: "Settled",
    assignedAttorney: "Adv. Rekha Bhatt",
  },
  {
    id: "MTR-1198",
    client: "State vs. Kumar",
    caseType: "Criminal",
    billableHours: 90,
    hourlyRate: 5000,
    nextHearingDate: "2026-08-14",
    status: "In trial",
    assignedAttorney: "Adv. Farhan Ali",
  },
];

export const legalFormFields: FormFieldDef[] = [
  { key: "id", label: "Matter ID", type: "text", required: true },
  { key: "client", label: "Client", type: "relation", required: true },
  { key: "caseType", label: "Case Type", type: "select", required: true, options: ["Civil","Corporate","Criminal","Family","IP"] },
  { key: "billableHours", label: "Billable Hours", type: "number", required: false },
  { key: "hourlyRate", label: "Hourly Rate", type: "currency", required: false },
  { key: "nextHearingDate", label: "Next Hearing Date", type: "date", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Open","In discovery","In trial","Settled","Closed"] },
  { key: "assignedAttorney", label: "Assigned Attorney", type: "text", required: true },
];

export function getLegalRecord(recordId: string): Row {
  return legalRows.find((r) => String(r["id"]) === recordId) ?? legalRows[0];
}

export function getLegalDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Matter ID", value: r["id"], type: "text" },
    { label: "Client", value: r["client"], type: "relation" },
    { label: "Case Type", value: r["caseType"], type: "select", chipVariant: STATUS_VARIANT[String(r["caseType"])] ?? "neutral" },
    { label: "Billable Hours", value: r["billableHours"], type: "text" },
    { label: "Hourly Rate", value: r["hourlyRate"], type: "currency" },
    { label: "Next Hearing Date", value: r["nextHearingDate"], type: "date" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Assigned Attorney", value: r["assignedAttorney"], type: "text" },
  ];
}

export function getLegalTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["nextHearingDate"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const legalRelated: RelatedRecord[] = [];
