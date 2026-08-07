import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Work Order sample data for the manufacturing module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Planned": "neutral",
  "In production": "warning",
  "QC": "amber",
  "Completed": "success",
  "Delayed": "danger"
};

export const manufacturingColumns: Column[] = [
  { key: "id", label: "Work Order ID", type: "text" },
  { key: "productName", label: "Product", type: "text" },
  { key: "bomReference", label: "BOM Reference", type: "text" },
  { key: "quantityPlanned", label: "Quantity Planned", type: "text" },
  { key: "quantityProduced", label: "Quantity Produced", type: "text" },
  { key: "rawMaterialsConsumed", label: "Raw Materials Consumed", type: "text" },
  { key: "startDate", label: "Start Date", type: "date" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const manufacturingRows: Row[] = [
  {
    id: "WO-M-3301",
    productName: "Steel Bracket — 40mm",
    bomReference: "BOM-BRK-40",
    quantityPlanned: 5000,
    quantityProduced: 3200,
    rawMaterialsConsumed: "MS Sheet 2mm — 640kg, Zinc coating — 12L",
    startDate: "2026-08-03",
    dueDate: "2026-08-12",
    status: "In production",
  },
  {
    id: "WO-M-3300",
    productName: "Plastic Housing — Type B",
    bomReference: "BOM-HSG-B",
    quantityPlanned: 2000,
    quantityProduced: 2000,
    rawMaterialsConsumed: "ABS Granules — 480kg",
    startDate: "2026-07-25",
    dueDate: "2026-08-01",
    status: "Completed",
  },
  {
    id: "WO-M-3299",
    productName: "Aluminium Panel — 1200x600",
    bomReference: "BOM-PNL-1200",
    quantityPlanned: 800,
    quantityProduced: 0,
    rawMaterialsConsumed: "—",
    startDate: null,
    dueDate: "2026-08-20",
    status: "Planned",
  },
  {
    id: "WO-M-3298",
    productName: "Rubber Gasket Set",
    bomReference: "BOM-GSK-STD",
    quantityPlanned: 10000,
    quantityProduced: 6400,
    rawMaterialsConsumed: "EPDM Compound — 210kg",
    startDate: "2026-07-28",
    dueDate: "2026-08-05",
    status: "Delayed",
  },
];

export const manufacturingFormFields: FormFieldDef[] = [
  { key: "id", label: "Work Order ID", type: "text", required: true },
  { key: "productName", label: "Product", type: "text", required: true },
  { key: "bomReference", label: "BOM Reference", type: "text", required: true },
  { key: "quantityPlanned", label: "Quantity Planned", type: "number", required: true },
  { key: "quantityProduced", label: "Quantity Produced", type: "number", required: false },
  { key: "rawMaterialsConsumed", label: "Raw Materials Consumed", type: "textarea", required: false },
  { key: "startDate", label: "Start Date", type: "date", required: false },
  { key: "dueDate", label: "Due Date", type: "date", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Planned","In production","QC","Completed","Delayed"] },
];

export function getManufacturingRecord(recordId: string): Row {
  return manufacturingRows.find((r) => String(r["id"]) === recordId) ?? manufacturingRows[0];
}

export function getManufacturingDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Work Order ID", value: r["id"], type: "text" },
    { label: "Product", value: r["productName"], type: "text" },
    { label: "BOM Reference", value: r["bomReference"], type: "text" },
    { label: "Quantity Planned", value: r["quantityPlanned"], type: "text" },
    { label: "Quantity Produced", value: r["quantityProduced"], type: "text" },
    { label: "Raw Materials Consumed", value: r["rawMaterialsConsumed"], type: "text" },
    { label: "Start Date", value: r["startDate"], type: "date" },
    { label: "Due Date", value: r["dueDate"], type: "date" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getManufacturingTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Work order raised from production plan by Production Planner — IP 103.21.44.33", timestamp: "2026-07-22T08:00:00", actor: "Production Planner" },
    { id: "t2", label: "Raw materials issued from stores against BOM", timestamp: "2026-07-23T09:00:00", actor: "Stores Team" },
    { id: "t3", label: "Production started on shop floor", timestamp: "2026-07-24T07:30:00", actor: "Shift Supervisor" },
    { id: "t4", label: "Quality check completed and status updated by QC Inspector — IP 103.21.44.34", timestamp: "2026-08-05T15:00:00", actor: "QC Inspector" },
  ];
}

export const manufacturingRelated: RelatedRecord[] = [];
