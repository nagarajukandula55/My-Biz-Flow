import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * BOM (Bill of Materials) — the flat material/item master catalog shared
 * across modules (POS, Service Centre, and anything else that sells or
 * consumes physical stock). One row per sellable/usable material — a
 * "Product (Finished Goods)" row does NOT carry its own sub-components
 * list here (that's a deliberate scope decision, confirmed with the
 * user 2026-08-08 — assembly/kitting is a Manufacturing-module concern,
 * not this catalog's). Warehouse-level stock quantities live in
 * warehouse.ts's Inventory records, not here — this is master data only.
 */

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Inactive: "neutral",
};

const TYPE_VARIANT: Record<string, StatusVariant> = {
  "Spare Part": "teal",
  Consumable: "amber",
  "Product (Finished Goods)": "success",
};

export const MATERIAL_TYPES = ["Spare Part", "Consumable", "Product (Finished Goods)"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const RATE_TYPES = ["With Tax", "Without Tax"] as const;
export type RateType = (typeof RATE_TYPES)[number];

/** Standard India GST slabs. */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export const UOM_OPTIONS = ["pcs", "box", "set", "pair", "kg", "g", "ltr", "ml", "roll", "meter"];

/**
 * Curated common HSN codes for electronics/repair/retail — not the full
 * multi-thousand-code government HSN master (confirmed scope 2026-08-08).
 * A BOM row can still carry any HSN code typed directly; this list is a
 * lookup convenience, not a hard constraint.
 */
export const HSN_CODES: { code: string; description: string }[] = [
  { code: "8517", description: "Telephones, smartphones & other transmission apparatus" },
  { code: "8471", description: "Computers & automatic data processing machines" },
  { code: "8523", description: "Discs, tapes & other recorded/storage media" },
  { code: "8507", description: "Electric accumulators / batteries" },
  { code: "8544", description: "Insulated wire, cable & other electric conductors" },
  { code: "8536", description: "Electrical switches, connectors & junction boxes" },
  { code: "8473", description: "Parts & accessories for computers/office machines" },
  { code: "8529", description: "Parts for TV/radio transmission & reception apparatus" },
  { code: "3926", description: "Other articles of plastic" },
  { code: "7318", description: "Screws, bolts, nuts & other threaded fasteners" },
  { code: "8481", description: "Taps, valves & similar appliances" },
  { code: "9018", description: "Instruments used in medical/surgical/dental sciences" },
  { code: "998719", description: "Maintenance & repair services (SAC)" },
];

export const bomColumns: Column[] = [
  { key: "id", label: "Material Code", type: "text" },
  { key: "description", label: "Material Description", type: "text" },
  { key: "barcode", label: "Barcode", type: "text" },
  { key: "hsnCode", label: "HSN Code", type: "text" },
  { key: "type", label: "Type", type: "select-chip", chipVariantMap: TYPE_VARIANT },
  { key: "uom", label: "UOM", type: "text" },
  { key: "rate", label: "Rate", type: "currency" },
  { key: "rateType", label: "Rate Type", type: "text" },
  { key: "taxPercent", label: "Tax %", type: "percentage" },
  { key: "mrp", label: "MRP", type: "currency" },
  { key: "serialized", label: "Serialized", type: "boolean" },
  { key: "category", label: "Category", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const bomRows: Row[] = [
  {
    id: "MAT-1001",
    description: "Samsung Galaxy Display Assembly — A54",
    barcode: "8901234501001",
    hsnCode: "8529",
    type: "Spare Part",
    uom: "pcs",
    rate: 3200,
    rateType: "Without Tax",
    taxPercent: 18,
    mrp: 4200,
    serialized: false,
    category: "Display",
    status: "Active",
  },
  {
    id: "MAT-1002",
    description: "Li-ion Battery 4000mAh — Generic",
    barcode: "8901234501002",
    hsnCode: "8507",
    type: "Spare Part",
    uom: "pcs",
    rate: 850,
    rateType: "Without Tax",
    taxPercent: 18,
    mrp: 1200,
    serialized: true,
    category: "Battery",
    status: "Active",
  },
  {
    id: "MAT-1003",
    description: "USB-C Charging Port Flex Cable",
    barcode: "8901234501003",
    hsnCode: "8544",
    type: "Spare Part",
    uom: "pcs",
    rate: 180,
    rateType: "Without Tax",
    taxPercent: 18,
    mrp: 350,
    serialized: false,
    category: "Connector",
    status: "Active",
  },
  {
    id: "MAT-1004",
    description: "Isopropyl Alcohol Cleaning Solution — 500ml",
    barcode: "8901234501004",
    hsnCode: "3926",
    type: "Consumable",
    uom: "ltr",
    rate: 220,
    rateType: "With Tax",
    taxPercent: 12,
    mrp: 280,
    serialized: false,
    category: "Consumable",
    status: "Active",
  },
  {
    id: "MAT-1005",
    description: "Precision Screwdriver Kit Screws — Assorted",
    barcode: "8901234501005",
    hsnCode: "7318",
    type: "Consumable",
    uom: "box",
    rate: 90,
    rateType: "With Tax",
    taxPercent: 18,
    mrp: 120,
    serialized: false,
    category: "Fasteners",
    status: "Active",
  },
  {
    id: "MAT-1006",
    description: "Refurbished Smartphone Bundle — Mid Range",
    barcode: "8901234501006",
    hsnCode: "8517",
    type: "Product (Finished Goods)",
    uom: "pcs",
    rate: 8500,
    rateType: "Without Tax",
    taxPercent: 18,
    mrp: 11999,
    serialized: true,
    category: "Product",
    status: "Active",
  },
  {
    id: "MAT-1007",
    description: "Wireless Earbuds — Legacy Model",
    barcode: "8901234501007",
    hsnCode: "8517",
    type: "Product (Finished Goods)",
    uom: "pcs",
    rate: 999,
    rateType: "Without Tax",
    taxPercent: 18,
    mrp: 1499,
    serialized: false,
    category: "Accessory",
    status: "Inactive",
  },
];

export const bomFormFields: FormFieldDef[] = [
  { key: "id", label: "Material Code", type: "text", required: false },
  { key: "description", label: "Material Description", type: "text", required: true },
  { key: "barcode", label: "Barcode", type: "text", required: false },
  { key: "hsnCode", label: "HSN Code", type: "select", required: true, options: HSN_CODES.map((h) => `${h.code} — ${h.description}`) },
  { key: "type", label: "Type", type: "select", required: true, options: [...MATERIAL_TYPES] },
  { key: "uom", label: "UOM", type: "select", required: true, options: UOM_OPTIONS },
  { key: "rate", label: "Rate", type: "currency", required: true },
  { key: "rateType", label: "Rate Type", type: "select", required: true, options: [...RATE_TYPES] },
  { key: "taxPercent", label: "Tax %", type: "select", required: true, options: GST_RATES.map(String) },
  { key: "mrp", label: "MRP", type: "currency", required: false },
  { key: "serialized", label: "Serialized (Serial / IMEI tracked)", type: "boolean", required: false },
  { key: "category", label: "Category", type: "text", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getBomRecord(recordId: string): Row {
  return bomRows.find((r) => String(r["id"]) === recordId) ?? bomRows[0];
}

export function getBomDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Material Code", value: r["id"], type: "text" },
    { label: "Material Description", value: r["description"], type: "text" },
    { label: "Barcode", value: r["barcode"], type: "text" },
    { label: "HSN Code", value: r["hsnCode"], type: "text" },
    { label: "Type", value: r["type"], type: "select", chipVariant: TYPE_VARIANT[String(r["type"])] ?? "neutral" },
    { label: "UOM", value: r["uom"], type: "text" },
    { label: "Rate", value: r["rate"], type: "currency" },
    { label: "Rate Type", value: r["rateType"], type: "text" },
    { label: "Tax %", value: r["taxPercent"], type: "percentage" },
    { label: "MRP", value: r["mrp"], type: "currency" },
    { label: "Serialized", value: r["serialized"], type: "boolean" },
    { label: "Category", value: r["category"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getBomTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Material added to catalog by Inventory Admin — IP 103.21.44.12", timestamp: "2026-07-10T10:00:00", actor: "Inventory Admin" },
    { id: "t2", label: "Rate updated after supplier price revision", timestamp: "2026-07-28T14:20:00", actor: "Inventory Admin" },
  ];
}

export const bomRelated: RelatedRecord[] = [];

/** Convenience lookup for other modules (Billing/POS/Service Centre dropdowns). */
export function getBomOptions(): { value: string; label: string }[] {
  return bomRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["id"]} — ${r["description"]}` }));
}
