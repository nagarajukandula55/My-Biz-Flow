import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Item / product catalog for the Billing module — invoice, credit-note and
 * debit-note line items can look one of these up by id instead of typing a
 * description/rate/tax freehand. Real persistence: BusinessRecord
 * moduleSlug "billing-items".
 */

const ITEM_TYPE_VARIANT: Record<string, StatusVariant> = {
  Goods: "teal",
  Service: "success",
};

export const ITEM_TYPES = ["Goods", "Service"] as const;
export const ITEM_UNITS = ["pcs", "hrs", "kg", "box", "license", "month", "package", "job"] as const;

export const billingItemColumns: Column[] = [
  { key: "id", label: "Item Code", type: "text" },
  { key: "name", label: "Name", type: "text" },
  { key: "type", label: "Type", type: "select-chip", chipVariantMap: ITEM_TYPE_VARIANT },
  { key: "unit", label: "Unit", type: "text" },
  { key: "rate", label: "Rate", type: "currency" },
  { key: "taxRate", label: "Tax Rate %", type: "text" },
  { key: "hsnSac", label: "HSN/SAC", type: "text" },
];

export const billingItemFormFields: FormFieldDef[] = [
  { key: "id", label: "Item Code", type: "text", required: false },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "type", label: "Type", type: "select", required: true, options: [...ITEM_TYPES] },
  { key: "unit", label: "Unit", type: "select", required: true, options: [...ITEM_UNITS] },
  { key: "rate", label: "Rate", type: "currency", required: true },
  { key: "taxRate", label: "Tax Rate %", type: "number", required: true },
  { key: "hsnSac", label: "HSN/SAC", type: "text", required: false },
  { key: "description", label: "Description", type: "textarea", required: false },
];

export function getBillingItemDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Item Code", value: r["id"], type: "text" },
    { label: "Name", value: r["name"], type: "text" },
    { label: "Type", value: r["type"], type: "select", chipVariant: ITEM_TYPE_VARIANT[String(r["type"])] ?? "neutral" },
    { label: "Unit", value: r["unit"], type: "text" },
    { label: "Rate", value: r["rate"], type: "currency" },
    { label: "Tax Rate %", value: r["taxRate"], type: "text" },
    { label: "HSN/SAC", value: r["hsnSac"], type: "text" },
    { label: "Description", value: r["description"], type: "text" },
  ];
}

export function getBillingItemTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Item added to Billing catalog", timestamp: new Date().toISOString(), actor: "System" },
  ];
}

export const billingItemRelated: RelatedRecord[] = [];
