import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";

// Device Brand catalog owned by the service-centre module (distinct from
// the multi-location "Brand" module — this is "brand of the device being
// serviced", e.g. Honda, Samsung). Vendor-owned data, not shared.

export const scBrandColumns: Column[] = [
  { key: "id", label: "Brand Code", type: "text" },
  { key: "name", label: "Brand Name", type: "text" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scBrandRows: Row[] = [
  { id: "SCB-001", name: "Honda", category: "Two-Wheeler", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-002", name: "TVS", category: "Two-Wheeler", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-003", name: "Royal Enfield", category: "Two-Wheeler", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-004", name: "Bajaj", category: "Two-Wheeler / EV", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-005", name: "Samsung", category: "Electronics", status: "Active", moduleSlug: "service-centre" },
];

export const scBrandFormFields: FormFieldDef[] = [
  { key: "id", label: "Brand Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "name", label: "Brand Name", type: "text", required: true },
  { key: "category", label: "Category", type: "text", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScBrandRecord(recordId: string): Row {
  return scBrandRows.find((r) => String(r["id"]) === recordId) ?? scBrandRows[0];
}

export function getScBrandDetailFields(record: Row): RecordField[] {
  return [
    { label: "Brand Code", value: record["id"], type: "text" },
    { label: "Brand Name", value: record["name"], type: "text" },
    { label: "Category", value: record["category"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getScBrandTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Brand "${record["name"]}" added`, timestamp: "2026-07-01T09:00:00", actor: "Vendor Admin" }];
}

export const scBrandRelated: RelatedRecord[] = [];

export function getScBrandOptions(): { value: string; label: string }[] {
  return scBrandRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}
