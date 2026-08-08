import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { MODULES } from "@/lib/designer/modules";
import { roleRows } from "./roles";
import { planRows } from "./plans";

// Vendor Type — the new top-level platform entity a vendor account is
// created against. Defines: which modules are bundled on by default,
// which Roles (platform-level, see roles.ts) are assignable to that
// type's users, and which Plans apply. Drives Signup (pick a type),
// Pricing (per type), and login/role-based access downstream.

const MODULE_SLUGS = MODULES.map((m) => m.slug);
const ROLE_NAMES = roleRows.map((r) => String(r["id"]));
const PLAN_NAMES = planRows.map((r) => String(r["name"] ?? r["id"]));

export const vendorTypeColumns: Column[] = [
  { key: "id", label: "Vendor Type", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "defaultModules", label: "Default Modules", type: "multi-chip" },
  { key: "assignableRoles", label: "Assignable Roles", type: "multi-chip" },
  { key: "plans", label: "Available Plans", type: "multi-chip" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const vendorTypeRows: Row[] = [
  {
    id: "POS Retailer",
    description: "Retail storefronts selling off-the-shelf inventory at a counter.",
    defaultModules: ["pos", "billing", "inventory", "loyalty-rewards"],
    assignableRoles: ["Cashier", "Owner / Admin"],
    plans: ["Basic", "Pro"],
    status: "Active",
  },
  {
    id: "Service Centre",
    description: "Repair/service shops running workorders, brands/models, and parts.",
    defaultModules: ["service-centre", "inventory", "billing", "amc-field-service"],
    assignableRoles: ["Technician", "Accountant", "Owner / Admin"],
    plans: ["Pro", "Ultimate"],
    status: "Active",
  },
  {
    id: "Clinic",
    description: "Patient/client records, appointments, consultation billing.",
    defaultModules: ["clinic", "billing", "accounting-gst"],
    assignableRoles: ["Accountant", "Owner / Admin"],
    plans: ["Basic", "Pro", "Ultimate"],
    status: "Active",
  },
  {
    id: "Multi-Location Brand",
    description: "Brand/partner/location hierarchy — franchises and multi-branch chains.",
    defaultModules: ["brand", "pos", "inventory", "hrms"],
    assignableRoles: ["Owner / Admin"],
    plans: ["Ultimate"],
    status: "Active",
  },
];

export const vendorTypeFormFields: FormFieldDef[] = [
  { key: "id", label: "Vendor Type Name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea", required: false },
  { key: "defaultModules", label: "Default Modules", type: "multi-select", required: true, options: MODULE_SLUGS },
  { key: "assignableRoles", label: "Assignable Roles", type: "multi-select", required: true, options: ROLE_NAMES },
  { key: "plans", label: "Available Plans", type: "multi-select", required: true, options: PLAN_NAMES },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getVendorTypeRecord(recordId: string): Row {
  return vendorTypeRows.find((r) => String(r["id"]) === recordId) ?? vendorTypeRows[0];
}

export function getVendorTypeDetailFields(record: Row): RecordField[] {
  return [
    { label: "Vendor Type Name", value: record["id"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Default Modules", value: record["defaultModules"], type: "multi-select" },
    { label: "Assignable Roles", value: record["assignableRoles"], type: "multi-select" },
    { label: "Available Plans", value: record["plans"], type: "multi-select" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getVendorTypeTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Vendor Type "${record["id"]}" created`, timestamp: "2026-08-08T09:00:00", actor: "Super Admin" },
  ];
}

export const vendorTypeRelated: RelatedRecord[] = [];

/** Dropdown options for Signup — active types only. */
export function getVendorTypeOptions(): { value: string; label: string }[] {
  return vendorTypeRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["id"]) }));
}
