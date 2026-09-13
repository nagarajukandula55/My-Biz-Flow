import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { DEVICE_CATEGORY_OPTIONS } from "./service-centre-fault-codes";

// Symptom Code catalog for the service-centre module — partner-owned data,
// same pattern as service-centre-fault-codes.ts. A Symptom Code is what the
// customer/technician *observed* (distinct from the Fault Code, which is the
// underlying cause) — ported from AN-CRM's SymptomCode model. Selected
// per-line on a workorder's Parts & Service Lines (see
// PartLine/ServiceLine.symptomCodeId in service-centre.ts).

export const scSymptomCodeColumns: Column[] = [
  { key: "id", label: "Symptom Code", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "deviceCategoryScope", label: "Applicable Device Categories", type: "multi-chip" },
  { key: "parentId", label: "Parent Symptom Code", type: "text" },
  { key: "isActive", label: "Active", type: "select-chip" },
];

export const scSymptomCodeRows: Row[] = [
  {
    id: "SYM-001",
    description: "Device won't power on",
    category: "Power",
    deviceCategoryScope: ["Electronics", "Computer"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SYM-002",
    description: "Unusual noise while running",
    category: "Mechanical",
    deviceCategoryScope: ["Two-Wheeler", "Four-Wheeler"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SYM-003",
    description: "Screen flickering",
    category: "Display",
    deviceCategoryScope: ["Electronics", "Computer"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
];

export const scSymptomCodeFormFields: FormFieldDef[] = [
  { key: "id", label: "Symptom Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "description", label: "Description", type: "text", required: true },
  { key: "category", label: "Category (component grouping)", type: "text", required: false },
  { key: "deviceCategoryScope", label: "Applicable Device Categories", type: "multi-select", required: false, options: DEVICE_CATEGORY_OPTIONS },
  { key: "parentId", label: "Parent Symptom Code (for a tree of related symptoms)", type: "text", required: false },
  { key: "isActive", label: "Active", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScSymptomCodeRecord(recordId: string): Row {
  return scSymptomCodeRows.find((r) => String(r["id"]) === recordId) ?? scSymptomCodeRows[0];
}

export function getScSymptomCodeDetailFields(record: Row): RecordField[] {
  return [
    { label: "Symptom Code", value: record["id"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Category", value: record["category"], type: "text" },
    { label: "Applicable Device Categories", value: record["deviceCategoryScope"], type: "text" },
    { label: "Parent Symptom Code", value: record["parentId"], type: "text" },
    { label: "Active", value: record["isActive"], type: "select" },
  ];
}

export function getScSymptomCodeTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Symptom code "${record["id"]}" added to catalog`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" }];
}

export const scSymptomCodeRelated: RelatedRecord[] = [];

/** Dropdown options for use on a workorder's line items, filtered to Active. */
export function getScSymptomCodeOptions(): { value: string; label: string }[] {
  return scSymptomCodeRows
    .filter((r) => r["isActive"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["id"]} — ${r["description"]}` }));
}
