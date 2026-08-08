import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { getScBrandOptions } from "./service-centre-brands";

// Device Model catalog owned by the service-centre module, each model
// belonging to one Brand from service-centre-brands.ts. Vendor-owned data.

export const scModelColumns: Column[] = [
  { key: "id", label: "Model Code", type: "text" },
  { key: "brandName", label: "Brand", type: "relation-link" },
  { key: "name", label: "Model Name", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scModelRows: Row[] = [
  { id: "SCM-001", brandName: "Honda", name: "Activa 6G", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-002", brandName: "TVS", name: "Jupiter", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-003", brandName: "Royal Enfield", name: "Classic 350", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-004", brandName: "Bajaj", name: "Chetak EV", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-005", brandName: "Samsung", name: "Galaxy S24", status: "Active", moduleSlug: "service-centre" },
];

export const scModelFormFields: FormFieldDef[] = [
  { key: "id", label: "Model Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "brandName", label: "Brand", type: "select", required: true, options: getScBrandOptions().map((o) => o.label) },
  { key: "name", label: "Model Name", type: "text", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScModelRecord(recordId: string): Row {
  return scModelRows.find((r) => String(r["id"]) === recordId) ?? scModelRows[0];
}

export function getScModelDetailFields(record: Row): RecordField[] {
  return [
    { label: "Model Code", value: record["id"], type: "text" },
    { label: "Brand", value: record["brandName"], type: "relation" },
    { label: "Model Name", value: record["name"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getScModelTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Model "${record["name"]}" added`, timestamp: "2026-07-01T09:00:00", actor: "Vendor Admin" }];
}

export const scModelRelated: RelatedRecord[] = [];

export function getScModelOptions(): { value: string; label: string }[] {
  return scModelRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}
