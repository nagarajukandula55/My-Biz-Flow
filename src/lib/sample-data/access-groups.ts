import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { MODULES } from "@/lib/designer/modules";

// Access Group sample data — a named bundle of module slugs. Part of the
// three-level vendor RBAC model: User -> Role -> Access Group -> modules.
// See CLAUDE.md "Users, Roles, and Access Groups".

const MODULE_SLUGS = MODULES.map((m) => m.slug);

export const accessGroupColumns: Column[] = [
  { key: "id", label: "Access Group", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "modules", label: "Modules", type: "multi-chip" },
];

export const accessGroupRows: Row[] = [
  {
    id: "Sales Floor",
    description: "Front-of-house selling: point of sale, invoicing, stock lookups.",
    modules: ["pos", "billing", "inventory"],
  },
  {
    id: "Service Ops",
    description: "Service Centre workorders plus the inventory/parts they consume.",
    modules: ["service-centre", "inventory", "amc-field-service"],
  },
  {
    id: "Back Office",
    description: "Accounting, payroll, and compliance — no customer-facing modules.",
    modules: ["accounting-gst", "hrms", "billing"],
  },
  {
    id: "Full Access",
    description: "Every module enabled — reserved for owners/admins.",
    modules: MODULE_SLUGS,
  },
];

export const accessGroupFormFields: FormFieldDef[] = [
  { key: "id", label: "Access Group Name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea", required: false },
  {
    key: "modules",
    label: "Modules",
    type: "multi-select",
    required: true,
    options: MODULE_SLUGS,
  },
];

export function getAccessGroupRecord(recordId: string): Row {
  return accessGroupRows.find((r) => String(r["id"]) === recordId) ?? accessGroupRows[0];
}

export function getAccessGroupDetailFields(record: Row): RecordField[] {
  return [
    { label: "Access Group Name", value: record["id"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Modules", value: record["modules"], type: "multi-select" },
  ];
}

export function getAccessGroupTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Access group "${record["id"]}" created`, timestamp: "2026-06-01T09:00:00", actor: "Super Admin" },
    { id: "t2", label: "Module list last edited", timestamp: "2026-07-15T11:30:00", actor: "Super Admin" },
  ];
}

export const accessGroupRelated: RelatedRecord[] = [];
