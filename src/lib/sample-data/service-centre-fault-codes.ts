import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { DEVICE_CATEGORIES, DEVICE_CATEGORY_LABELS } from "./service-centre";

// Fault Code catalog for the service-centre module — partner-owned data,
// same pattern as service-centre-brands.ts/service-centre-models.ts. A
// Fault Code is the underlying cause of a device issue (distinct from a
// Symptom Code, which is what the customer observed) — ported from
// AN-CRM's FaultCode model. Selected per-line on a workorder's Parts &
// Service Lines (see PartLine/ServiceLine.faultCodeId in service-centre.ts).

/**
 * Scope options for `deviceCategoryScope`. The reference app types its
 * FaultCode/SymptomCode `deviceCategory` as an enum over the very same 45
 * DEVICE_CATEGORIES the workorder intake form uses, so this reuses that
 * one list rather than keeping a parallel, coarser vocabulary of its own —
 * the "Two-Wheeler"/"Four-Wheeler" values here previously were invented by
 * an earlier build pass and have no counterpart in the reference app,
 * which has no vehicle category anywhere.
 */
export const DEVICE_CATEGORY_OPTIONS: string[] = DEVICE_CATEGORIES.map((c) => DEVICE_CATEGORY_LABELS[c]);

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
    category: "Battery",
    deviceCategoryScope: ["Mobile Phones", "Laptops", "Tablets"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "FLT-002",
    description: "Display panel cracked",
    category: "Screen",
    deviceCategoryScope: ["Mobile Phones", "Laptops", "Monitors", "Television"],
    parentId: "",
    isActive: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "FLT-003",
    description: "Compressor not cooling",
    category: "Cooling",
    deviceCategoryScope: ["Refrigerator", "Air Conditioner"],
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
