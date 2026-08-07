import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import { roleRows } from "./roles";

// Vendor team-member ("User") sample data — top tier of the three-level
// vendor RBAC model: User -> Role -> Access Group -> modules.
//
// IMPORTANT: this is a VENDOR's own team member (e.g. "Meena R., Cashier at
// this store"), completely distinct from central-api's `PlatformUser`
// (the cross-tenant login identity for the whole platform). No central-api
// integration is built here — that's out of scope for this pass, see
// CLAUDE.md's integration constraints.

const ROLE_NAMES = roleRows.map((r) => String(r["id"]));

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Invited: "warning",
  Suspended: "danger",
};

export const userColumns: Column[] = [
  { key: "id", label: "Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "role", label: "Role", type: "relation-link" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "lastLogin", label: "Last Login", type: "date" },
];

export const userRows: Row[] = [
  {
    id: "Meena R.",
    email: "meena.r@example-store.com",
    role: "Cashier",
    status: "Active",
    lastLogin: "2026-08-07T09:40:00",
  },
  {
    id: "Arjun D.",
    email: "arjun.d@example-store.com",
    role: "Technician",
    status: "Active",
    lastLogin: "2026-08-06T18:05:00",
  },
  {
    id: "Ravi K.",
    email: "ravi.k@example-store.com",
    role: "Accountant",
    status: "Invited",
    lastLogin: "",
  },
  {
    id: "Priya S.",
    email: "priya.s@example-store.com",
    role: "Owner / Admin",
    status: "Active",
    lastLogin: "2026-08-07T08:15:00",
  },
  {
    id: "Deepak M.",
    email: "deepak.m@example-store.com",
    role: "Cashier",
    status: "Suspended",
    lastLogin: "2026-05-12T14:22:00",
  },
];

export const userFormFields: FormFieldDef[] = [
  { key: "id", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "text", required: true },
  { key: "role", label: "Role", type: "select", required: true, options: ROLE_NAMES },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Invited", "Suspended"] },
  { key: "lastLogin", label: "Last Login", type: "date", required: false },
];

export function getUserRecord(recordId: string): Row {
  return userRows.find((r) => String(r["id"]) === recordId) ?? userRows[0];
}

export function getUserDetailFields(record: Row): RecordField[] {
  return [
    { label: "Name", value: record["id"], type: "text" },
    { label: "Email", value: record["email"], type: "text" },
    { label: "Role", value: record["role"], type: "relation" },
    { label: "Status", value: record["status"], type: "select", chipVariant: STATUS_VARIANT[String(record["status"])] ?? "neutral" },
    { label: "Last Login", value: record["lastLogin"], type: "date" },
  ];
}

export function getUserTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `User "${record["id"]}" invited to the vendor account`, timestamp: "2026-05-01T09:00:00", actor: "Priya S." },
    { id: "t2", label: `Role set to ${String(record["role"])}`, timestamp: "2026-05-01T09:02:00", actor: "Priya S." },
  ];
}

export const userRelated: RelatedRecord[] = [];
