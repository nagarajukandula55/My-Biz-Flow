import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { DEVICE_CATEGORIES, DEVICE_CATEGORY_LABELS } from "./service-centre";

// Device Brand catalog owned by the service-centre module (distinct from
// the multi-location "Brand" module — this is "brand of the device being
// serviced", e.g. Samsung, LG). Partner-owned data, not shared.
//
// This module serves ELECTRONICS AND APPLIANCE repair shops. It has no
// vehicle side: the reference app's device taxonomy
// (src/lib/sample-data/service-centre.ts's DEVICE_CATEGORIES, ported 1:1
// from its own 45-value list) contains no vehicle category at all. The
// two-wheeler brands/models that used to sit in this file were invented
// by an earlier build pass, not ported, and misrepresented what the
// module is for. `category` holds a DEVICE_CATEGORIES label.

export const scBrandColumns: Column[] = [
  { key: "id", label: "Brand Code", type: "text" },
  { key: "name", label: "Brand Name", type: "text" },
  { key: "category", label: "Device Type", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scBrandRows: Row[] = [
  { id: "SCB-001", name: "Samsung", category: "Mobile Phones", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-002", name: "Apple", category: "Mobile Phones", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-003", name: "Xiaomi", category: "Mobile Phones", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-004", name: "Dell", category: "Laptops", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-005", name: "HP", category: "Laptops", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-006", name: "Sony", category: "Television", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-007", name: "LG", category: "Refrigerator", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-008", name: "Whirlpool", category: "Washing Machine", status: "Active", moduleSlug: "service-centre" },
];

export const scBrandFormFields: FormFieldDef[] = [
  { key: "id", label: "Brand Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "name", label: "Brand Name", type: "text", required: true },
  // The device type this brand is catalogued under — the same 45-value
  // taxonomy the workorder intake form's "Device Type" uses, so a brand
  // and the job it's picked on can never disagree about what kind of
  // device is being talked about.
  { key: "category", label: "Device Type", type: "select", required: false, options: DEVICE_CATEGORIES.map((c) => DEVICE_CATEGORY_LABELS[c]) },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScBrandRecord(recordId: string): Row {
  return scBrandRows.find((r) => String(r["id"]) === recordId) ?? scBrandRows[0];
}

export function getScBrandDetailFields(record: Row): RecordField[] {
  return [
    { label: "Brand Code", value: record["id"], type: "text" },
    { label: "Brand Name", value: record["name"], type: "text" },
    { label: "Device Type", value: record["category"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getScBrandTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Brand "${record["name"]}" added`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" }];
}

export const scBrandRelated: RelatedRecord[] = [];

export function getScBrandOptions(): { value: string; label: string }[] {
  return scBrandRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}
