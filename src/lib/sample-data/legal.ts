import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Matter sample data for the legal module — realistic field modeling.
// Billable-hours logging, the case stage stepper, and invoice generation
// live in src/app/partner/[partnerId]/legal/[recordId]/actions.ts and are
// persisted onto the real BusinessRecord (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Open": "teal",
  "In discovery": "warning",
  "In trial": "amber",
  "Settled": "success",
  "Closed": "neutral"
};

/** Single-page matter lifecycle stages — see MatterLifecycle.tsx. Distinct from the free-form "status" field above. */
export type MatterStage = "New" | "Discovery" | "Filing" | "Hearing" | "Resolved";
export const MATTER_STAGES: MatterStage[] = ["New", "Discovery", "Filing", "Hearing", "Resolved"];

/** One billable-hours entry, appended by the Log Hours action. */
export interface TimeLogEntry {
  id: string;
  date: string; // ISO date
  hours: number;
  description: string;
  rate: number; // ₹/hour for this entry — allows different activities to bill at different rates
}

/** Running total (hours * rate) across every logged entry — always recomputed, never trusted from the client. */
export function computeTimeLogTotal(log: TimeLogEntry[]): number {
  if (!log || log.length === 0) return 0;
  return log.reduce((sum, e) => sum + (Number(e.hours) || 0) * (Number(e.rate) || 0), 0);
}

/** True when a court date is set and falls within the next 7 days (not in the past). */
export function isCourtDateApproaching(courtDate: string | undefined | null): boolean {
  if (!courtDate) return false;
  const target = new Date(courtDate).getTime();
  if (Number.isNaN(target)) return false;
  const now = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;
  const diffDays = (target - now) / msInDay;
  return diffDays >= 0 && diffDays <= 7;
}

export const legalColumns: Column[] = [
  { key: "id", label: "Matter ID", type: "text" },
  { key: "client", label: "Client", type: "relation-link" },
  { key: "caseType", label: "Case Type", type: "select-chip" },
  { key: "stage", label: "Stage", type: "select-chip" },
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
    stage: "Discovery",
    billableHours: 42,
    hourlyRate: 4500,
    timeLog: [
      { id: "TL-1", date: "2026-07-15", hours: 20, description: "Contract review", rate: 4500 },
      { id: "TL-2", date: "2026-07-28", hours: 22, description: "Discovery drafting", rate: 4500 },
    ],
    nextHearingDate: "2026-08-18",
    status: "In discovery",
    assignedAttorney: "Adv. Rekha Bhatt",
  },
  {
    id: "MTR-1200",
    client: "Priya Narayanan",
    caseType: "Family",
    stage: "New",
    billableHours: 18,
    hourlyRate: 3000,
    timeLog: [{ id: "TL-1", date: "2026-08-02", hours: 18, description: "Initial consultation & filing prep", rate: 3000 }],
    nextHearingDate: "2026-08-25",
    status: "Open",
    assignedAttorney: "Adv. Sameer Joshi",
  },
  {
    id: "MTR-1199",
    client: "Innovate Labs Pvt Ltd",
    caseType: "IP",
    stage: "Resolved",
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
    stage: "Hearing",
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
  { key: "hourlyRate", label: "Default Hourly Rate", type: "currency", required: false },
  { key: "nextHearingDate", label: "Next Court Date", type: "date", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Open","In discovery","In trial","Settled","Closed"] },
  { key: "assignedAttorney", label: "Assigned Attorney", type: "text", required: true },
];

export function getLegalRecord(recordId: string): Row {
  return legalRows.find((r) => String(r["id"]) === recordId) ?? legalRows[0];
}

export function getLegalDetailFields(record: Row): RecordField[] {
  const r = record;
  const log = (r["timeLog"] as TimeLogEntry[] | undefined) ?? [];
  const billableHours = log.length > 0 ? log.reduce((s, e) => s + (Number(e.hours) || 0), 0) : r["billableHours"];
  return [
    { label: "Matter ID", value: r["id"], type: "text" },
    { label: "Client", value: r["client"], type: "relation" },
    { label: "Case Type", value: r["caseType"], type: "select", chipVariant: STATUS_VARIANT[String(r["caseType"])] ?? "neutral" },
    { label: "Billable Hours", value: billableHours, type: "text" },
    { label: "Hourly Rate", value: r["hourlyRate"], type: "currency" },
    { label: "Next Hearing Date", value: r["nextHearingDate"], type: "date" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Assigned Attorney", value: r["assignedAttorney"], type: "text" },
  ];
}

export function getLegalTimeline(record: Row): TimelineEntry[] {
  const log = (record["timeLog"] as TimeLogEntry[] | undefined) ?? [];
  const hourEntries: TimelineEntry[] = log
    .slice(-5)
    .map((e) => ({
      id: `hrs-${e.id}`,
      label: `${e.hours}h logged — ${e.description} (₹${e.rate}/hr) by ${record["assignedAttorney"] ?? "Assigned Attorney"}`,
      timestamp: `${e.date}T17:00:00`,
      actor: String(record["assignedAttorney"] ?? "Assigned Attorney"),
    }));
  return [
    { id: "t1", label: "Matter opened and assigned to attorney by Legal Ops — IP 103.21.44.27", timestamp: "2026-05-20T09:00:00", actor: "Legal Ops" },
    ...hourEntries,
    { id: "t3", label: "Next hearing date scheduled and calendared", timestamp: "2026-08-01T09:30:00", actor: "Legal Ops" },
    { id: "t4", label: "Case status updated after latest court proceeding", timestamp: "2026-08-06T18:00:00", actor: "Assigned Attorney" },
  ];
}

export const legalRelated: RelatedRecord[] = [];
