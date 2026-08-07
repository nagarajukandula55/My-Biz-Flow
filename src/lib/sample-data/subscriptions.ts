import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Membership sample data for the subscriptions module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Active": "success",
  "Paused": "warning",
  "Expired": "danger",
  "Cancelled": "neutral"
};

export const subscriptionsColumns: Column[] = [
  { key: "id", label: "Membership ID", type: "text" },
  { key: "memberName", label: "Member Name", type: "text" },
  { key: "plan", label: "Plan", type: "select-chip" },
  { key: "startDate", label: "Start Date", type: "date" },
  { key: "renewalDate", label: "Renewal Date", type: "date" },
  { key: "planAmount", label: "Plan Amount", type: "currency" },
  { key: "lastCheckIn", label: "Last Check-in", type: "date" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const subscriptionsRows: Row[] = [
  {
    id: "MEM-9012",
    memberName: "Rohit Bhalla",
    plan: "Annual",
    startDate: "2026-01-15",
    renewalDate: "2027-01-15",
    planAmount: 24000,
    lastCheckIn: "2026-08-06",
    status: "Active",
  },
  {
    id: "MEM-9011",
    memberName: "Sneha Kulkarni",
    plan: "Monthly",
    startDate: "2026-07-01",
    renewalDate: "2026-08-01",
    planAmount: 2200,
    lastCheckIn: "2026-07-30",
    status: "Expired",
  },
  {
    id: "MEM-9010",
    memberName: "Tariq Anwar",
    plan: "Quarterly",
    startDate: "2026-06-10",
    renewalDate: "2026-09-10",
    planAmount: 6000,
    lastCheckIn: "2026-08-05",
    status: "Active",
  },
  {
    id: "MEM-9009",
    memberName: "Ishita Ghosh",
    plan: "Monthly",
    startDate: "2026-05-01",
    renewalDate: "2026-08-01",
    planAmount: 2200,
    lastCheckIn: "2026-06-12",
    status: "Paused",
  },
];

export const subscriptionsFormFields: FormFieldDef[] = [
  { key: "id", label: "Membership ID", type: "text", required: true },
  { key: "memberName", label: "Member Name", type: "text", required: true },
  { key: "plan", label: "Plan", type: "select", required: true, options: ["Monthly","Quarterly","Annual"] },
  { key: "startDate", label: "Start Date", type: "date", required: true },
  { key: "renewalDate", label: "Renewal Date", type: "date", required: true },
  { key: "planAmount", label: "Plan Amount", type: "currency", required: true },
  { key: "lastCheckIn", label: "Last Check-in", type: "date", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Paused","Expired","Cancelled"] },
];

export function getSubscriptionsRecord(recordId: string): Row {
  return subscriptionsRows.find((r) => String(r["id"]) === recordId) ?? subscriptionsRows[0];
}

export function getSubscriptionsDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Membership ID", value: r["id"], type: "text" },
    { label: "Member Name", value: r["memberName"], type: "text" },
    { label: "Plan", value: r["plan"], type: "select", chipVariant: STATUS_VARIANT[String(r["plan"])] ?? "neutral" },
    { label: "Start Date", value: r["startDate"], type: "date" },
    { label: "Renewal Date", value: r["renewalDate"], type: "date" },
    { label: "Plan Amount", value: r["planAmount"], type: "currency" },
    { label: "Last Check-in", value: r["lastCheckIn"], type: "date" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getSubscriptionsTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["startDate"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const subscriptionsRelated: RelatedRecord[] = [];
