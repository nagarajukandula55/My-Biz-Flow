import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";

// Fault Code catalog for the service-centre module — partner-owned data,
// same pattern as service-centre-brands.ts/service-centre-models.ts. A
// Fault Code is the underlying cause of a device/vehicle issue (distinct
// from a Symptom Code, which is what the customer observed) — ported from
// AN-CRM's FaultCode model. Selected per-line on a workorder's Parts &
// Service Lines (see PartLine/ServiceLine.faultCodeId in service-centre.ts).

export const DEVICE_CATEGORY_OPTIONS = [
  "Two-Wheeler",
  "Four-Wheeler",
  "Electronics",
  "Appliance",
  "Computer",
  "Other",
];

export const scFaultCodeColumns: Column[] = [
  { key: "id", label: "Fault Code", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "deviceCategoryScope", label: "Applicable Device Categories", type: "multi-chip" },
  { key: "parentId", label: "Parent Fault Code", type: "text" },
  { key: "isActive", label: "Active", type: "select-chip" },
];

export const scFaultCodeRows: Row[] = [
  {
    id: "FLT-001",
    description: "Battery not holding charge",
    category: "Electrical",
    deviceCategoryScope: ["Two-Wheeler", "Electronics"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "FLT-002",
    description: "Display panel cracked",
    category: "Hardware",
    deviceCategoryScope: ["Electronics", "Computer"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "FLT-003",
    description: "Engine overheating",
    category: "Mechanical",
    deviceCategoryScope: ["Two-Wheeler", "Four-Wheeler"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
];

export const scFaultCodeFormFields: FormFieldDef[] = [
  { key: "id", label: "Fault Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "description", label: "Description", type: "text", required: true },
  { key: "category", label: "Category (component grouping)", type: "text", required: false },
  { key: "deviceCategoryScope", label: "Applicable Device Categories", type: "multi-select", required: false, options: DEVICE_CATEGORY_OPTIONS },
  { key: "parentId", label: "Parent Fault Code (for a tree of related faults)", type: "text", required: false },
  { key: "isActive", label: "Active", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScFaultCodeRecord(recordId: string): Row {
  return scFaultCodeRows.find((r) => String(r["id"]) === recordId) ?? scFaultCodeRows[0];
}

export function getScFaultCodeDetailFields(record: Row): RecordField[] {
  return [
    { label: "Fault Code", value: record["id"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Category", value: record["category"], type: "text" },
    { label: "Applicable Device Categories", value: record["deviceCategoryScope"], type: "text" },
    { label: "Parent Fault Code", value: record["parentId"], type: "text" },
    { label: "Active", value: record["isActive"], type: "select" },
  ];
}

export function getScFaultCodeTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Fault code "${record["id"]}" added to catalog`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" }];
}

export const scFaultCodeRelated: RelatedRecord[] = [];

/** Dropdown options for use on a workorder's line items, filtered to Active. */
export function getScFaultCodeOptions(): { value: string; label: string }[] {
  return scFaultCodeRows
    .filter((r) => r["isActive"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["id"]} — ${r["description"]}` }));
}
