import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { MODULES } from "@/lib/designer/modules";

// Access Group sample data — a named bundle of module slugs, refined down
// to per-PAGE, per-ACTION permissions. Part of the three-level vendor RBAC
// model: User -> Role -> Access Group -> pages/actions.
// See CLAUDE.md "Users, Roles, and Access Groups".
//
// Deliberately free of any registry/registerAll import (which pulls in
// node:fs transitively) — this file is imported by a Client Component
// (AccessGroupClientTable). Registry-dependent helpers that compute the
// live per-page permission matrix live in
// src/lib/designer/accessGroupPermissions.ts instead, imported only from
// the Server Component New/Edit pages. Sample rows below seed
// pagePermissions empty — the real matrix is populated live from the
// Designer registry when a Super Admin opens Edit.

const MODULE_SLUGS = MODULES.map((m) => m.slug);

export type PageAction = "view" | "edit" | "delete" | "other";
export const PAGE_ACTIONS: PageAction[] = ["view", "edit", "delete", "other"];

export type PagePermission = {
  pageId: string;
  view: boolean;
  edit: boolean;
  delete: boolean;
  other: boolean;
};

export const accessGroupColumns: Column[] = [
  { key: "id", label: "Access Group", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "modules", label: "Modules", type: "multi-chip" },
];

const SALES_FLOOR_MODULES = ["pos", "billing", "inventory"];
const SERVICE_OPS_MODULES = ["service-centre", "inventory", "amc-field-service"];
const BACK_OFFICE_MODULES = ["accounting-gst", "hrms", "billing"];

export const accessGroupRows: Row[] = [
  {
    id: "Sales Floor",
    description: "Front-of-house selling: point of sale, invoicing, stock lookups.",
    modules: SALES_FLOOR_MODULES,
    pagePermissions: [] as PagePermission[],
  },
  {
    id: "Service Ops",
    description: "Service Centre workorders plus the inventory/parts they consume.",
    modules: SERVICE_OPS_MODULES,
    pagePermissions: [] as PagePermission[],
  },
  {
    id: "Back Office",
    description: "Accounting, payroll, and compliance — no customer-facing modules.",
    modules: BACK_OFFICE_MODULES,
    pagePermissions: [] as PagePermission[],
  },
  {
    id: "Full Access",
    description: "Every module enabled — reserved for owners/admins.",
    modules: MODULE_SLUGS,
    pagePermissions: [] as PagePermission[],
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
  const perms = (record["pagePermissions"] as PagePermission[] | undefined) ?? [];
  const grantedPages = perms.filter((p) => p.view || p.edit || p.delete || p.other).length;
  return [
    { label: "Access Group Name", value: record["id"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Modules", value: record["modules"], type: "multi-select" },
    { label: "Pages With Access", value: `${grantedPages} page(s) — see the permission matrix below`, type: "text" },
  ];
}

export function getAccessGroupTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Access group "${record["id"]}" created`, timestamp: "2026-06-01T09:00:00", actor: "Super Admin" },
    { id: "t2", label: "Module list last edited", timestamp: "2026-07-15T11:30:00", actor: "Super Admin" },
  ];
}

export const accessGroupRelated: RelatedRecord[] = [];
