import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { accessGroupRows } from "./access-groups";

// Role sample data — a bundle of Access Groups. Middle tier of the
// three-level vendor RBAC model: User -> Role -> Access Group -> modules.

const ACCESS_GROUP_NAMES = accessGroupRows.map((r) => String(r["id"]));

export const roleColumns: Column[] = [
  { key: "id", label: "Role", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "accessGroups", label: "Access Groups", type: "multi-chip" },
];

export const roleRows: Row[] = [
  {
    id: "Cashier",
    description: "Runs the register — sales, invoicing, stock lookups only.",
    accessGroups: ["Sales Floor"],
  },
  {
    id: "Technician",
    description: "Handles service workorders and parts consumption.",
    accessGroups: ["Service Ops"],
  },
  {
    id: "Accountant",
    description: "Back-office finance, payroll, and GST compliance.",
    accessGroups: ["Back Office"],
  },
  {
    id: "Owner / Admin",
    description: "Full access to every module and vendor-account settings.",
    accessGroups: ["Full Access", "Back Office"],
  },
];

export const roleFormFields: FormFieldDef[] = [
  { key: "id", label: "Role Name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea", required: false },
  {
    key: "accessGroups",
    label: "Access Groups Included",
    type: "multi-select",
    required: true,
    options: ACCESS_GROUP_NAMES,
  },
];

export function getRoleRecord(recordId: string): Row {
  return roleRows.find((r) => String(r["id"]) === recordId) ?? roleRows[0];
}

export function getRoleDetailFields(record: Row): RecordField[] {
  return [
    { label: "Role Name", value: record["id"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Access Groups Included", value: record["accessGroups"], type: "multi-select" },
  ];
}

export function getRoleTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Role "${record["id"]}" created`, timestamp: "2026-06-01T09:05:00", actor: "Super Admin" },
    { id: "t2", label: "Access group bundle last edited", timestamp: "2026-07-16T10:00:00", actor: "Super Admin" },
  ];
}

export const roleRelated: RelatedRecord[] = [];
