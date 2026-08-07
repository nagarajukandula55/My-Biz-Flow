import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Stock Item sample data for the inventory module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "In stock": "success",
  "Low stock": "warning",
  "Out of stock": "danger",
  "On order": "teal"
};

export const inventoryColumns: Column[] = [
  { key: "id", label: "Item Code", type: "text" },
  { key: "itemName", label: "Item Name", type: "text" },
  { key: "supplier", label: "Supplier", type: "relation-link" },
  { key: "warehouseLocation", label: "Warehouse Location", type: "text" },
  { key: "quantityOnHand", label: "Quantity on Hand", type: "text" },
  { key: "reorderLevel", label: "Reorder Level", type: "text" },
  { key: "unitCost", label: "Unit Cost", type: "currency" },
  { key: "lastPurchaseOrder", label: "Last Purchase Order", type: "text" },
  { key: "stockStatus", label: "Stock Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const inventoryRows: Row[] = [
  {
    id: "ITM-7701",
    itemName: "Corrugated Box — Medium",
    supplier: "Packwell Industries",
    warehouseLocation: "Rack A-12",
    quantityOnHand: 4200,
    reorderLevel: 1000,
    unitCost: 14,
    lastPurchaseOrder: "PO-9910",
    stockStatus: "In stock",
  },
  {
    id: "ITM-7700",
    itemName: "Thermal Printer Rolls",
    supplier: "Prinza Supplies",
    warehouseLocation: "Rack B-04",
    quantityOnHand: 120,
    reorderLevel: 200,
    unitCost: 45,
    lastPurchaseOrder: "PO-9905",
    stockStatus: "Low stock",
  },
  {
    id: "ITM-7699",
    itemName: "Safety Helmets",
    supplier: "Guardian Safety Co.",
    warehouseLocation: "Rack C-01",
    quantityOnHand: 0,
    reorderLevel: 50,
    unitCost: 320,
    lastPurchaseOrder: "PO-9880",
    stockStatus: "Out of stock",
  },
  {
    id: "ITM-7698",
    itemName: "Laptop Batteries — Type 4",
    supplier: "Voltex Components",
    warehouseLocation: "Rack D-09",
    quantityOnHand: 60,
    reorderLevel: 40,
    unitCost: 1800,
    lastPurchaseOrder: "PO-9920",
    stockStatus: "On order",
  },
];

export const inventoryFormFields: FormFieldDef[] = [
  { key: "id", label: "Item Code", type: "text", required: true },
  { key: "itemName", label: "Item Name", type: "text", required: true },
  { key: "supplier", label: "Supplier", type: "relation", required: true },
  { key: "warehouseLocation", label: "Warehouse Location", type: "text", required: false },
  { key: "quantityOnHand", label: "Quantity on Hand", type: "number", required: true },
  { key: "reorderLevel", label: "Reorder Level", type: "number", required: false },
  { key: "unitCost", label: "Unit Cost", type: "currency", required: true },
  { key: "lastPurchaseOrder", label: "Last Purchase Order", type: "text", required: false },
  { key: "stockStatus", label: "Stock Status", type: "select", required: true, options: ["In stock","Low stock","Out of stock","On order"] },
];

export function getInventoryRecord(recordId: string): Row {
  return inventoryRows.find((r) => String(r["id"]) === recordId) ?? inventoryRows[0];
}

export function getInventoryDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Item Code", value: r["id"], type: "text" },
    { label: "Item Name", value: r["itemName"], type: "text" },
    { label: "Supplier", value: r["supplier"], type: "relation" },
    { label: "Warehouse Location", value: r["warehouseLocation"], type: "text" },
    { label: "Quantity on Hand", value: r["quantityOnHand"], type: "text" },
    { label: "Reorder Level", value: r["reorderLevel"], type: "text" },
    { label: "Unit Cost", value: r["unitCost"], type: "currency" },
    { label: "Last Purchase Order", value: r["lastPurchaseOrder"], type: "text" },
    { label: "Stock Status", value: r["stockStatus"], type: "select", chipVariant: STATUS_VARIANT[String(r["stockStatus"])] ?? "neutral" },
  ];
}

export function getInventoryTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["id"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const inventoryRelated: RelatedRecord[] = [];
