import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { DEVICE_CATEGORY_OPTIONS } from "./service-centre-fault-codes";

// Solutions catalog for the service-centre module — partner-owned data (not
// shared across partners like BOM). Selected on a Workorder's Parts &
// Service Lines when logging what was done to resolve a job. Every row
// belongs exclusively to the service-centre module, hence `moduleSlug`.
//
// Future-proofing beyond AN-CRM's Solution model: estimatedRepairMinutes and
// standardLaborCost (both optional) let a solution seed a job's SLA/estimate
// automatically instead of being typed in fresh each time, and
// deviceCategoryScope lets the catalog be filtered by relevant device
// categories the same way Fault/Symptom codes are.

export const solutionsColumns: Column[] = [
  { key: "id", label: "Solution Code", type: "text" },
  { key: "title", label: "Solution", type: "text" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "defaultLaborCharge", label: "Default Labor Charge", type: "currency" },
  { key: "estimatedRepairMinutes", label: "Est. Repair Time (min)", type: "text" },
  { key: "standardLaborCost", label: "Standard Labor Cost", type: "currency" },
  { key: "deviceCategoryScope", label: "Applicable Device Categories", type: "multi-chip" },
  { key: "notes", label: "Notes", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const solutionsRows: Row[] = [
  {
    id: "SOL-001",
    title: "Screen replacement",
    category: "Hardware",
    defaultLaborCharge: 300,
    notes: "Includes calibration after fitment.",
    status: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SOL-002",
    title: "Battery replacement",
    category: "Hardware",
    defaultLaborCharge: 150,
    notes: "",
    status: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SOL-003",
    title: "Software reflash",
    category: "Software",
    defaultLaborCharge: 100,
    notes: "No parts consumed.",
    status: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SOL-004",
    title: "General service / cleaning",
    category: "Maintenance",
    defaultLaborCharge: 200,
    notes: "",
    status: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SOL-005",
    title: "Water damage repair",
    category: "Hardware",
    defaultLaborCharge: 500,
    notes: "No warranty coverage.",
    status: "Inactive",
    moduleSlug: "service-centre",
  },
];

export const solutionsFormFields: FormFieldDef[] = [
  { key: "id", label: "Solution Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "title", label: "Solution", type: "text", required: true },
  { key: "category", label: "Category", type: "select", required: true, options: ["Hardware", "Software", "Maintenance", "Other"] },
  { key: "defaultLaborCharge", label: "Default Labor Charge", type: "currency", required: false },
  { key: "estimatedRepairMinutes", label: "Est. Repair Time (minutes)", type: "number", required: false },
  { key: "standardLaborCost", label: "Standard Labor Cost", type: "currency", required: false },
  { key: "deviceCategoryScope", label: "Applicable Device Categories", type: "multi-select", required: false, options: DEVICE_CATEGORY_OPTIONS },
  { key: "notes", label: "Notes", type: "textarea", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getSolutionRecord(recordId: string): Row {
  return solutionsRows.find((r) => String(r["id"]) === recordId) ?? solutionsRows[0];
}

export function getSolutionDetailFields(record: Row): RecordField[] {
  return [
    { label: "Solution Code", value: record["id"], type: "text" },
    { label: "Solution", value: record["title"], type: "text" },
    { label: "Category", value: record["category"], type: "select" },
    { label: "Default Labor Charge", value: record["defaultLaborCharge"], type: "currency" },
    { label: "Est. Repair Time (minutes)", value: record["estimatedRepairMinutes"], type: "text" },
    { label: "Standard Labor Cost", value: record["standardLaborCost"], type: "currency" },
    { label: "Applicable Device Categories", value: record["deviceCategoryScope"], type: "text" },
    { label: "Notes", value: record["notes"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getSolutionTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Solution "${record["title"]}" added to catalog`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" },
  ];
}

export const solutionsRelated: RelatedRecord[] = [];

/** Dropdown options for use on the Workorder's Parts & Service Lines, filtered to Active. */
export function getSolutionOptions(): { value: string; label: string }[] {
  return solutionsRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["title"]) }));
}
