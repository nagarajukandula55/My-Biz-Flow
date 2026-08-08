import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import { getBomOptions } from "./bom";

/**
 * Warehouse + everything that hangs off it: Inventory (per-warehouse stock
 * ledger), Stock Adjustments, Return Orders, and Part Orders. Confirmed
 * shape (2026-08-08): a Service Centre location's mapped Warehouse is
 * configured on the Brand module's Location record (see brand.ts's
 * mappedWarehouse field), not here — a Warehouse doesn't enumerate which
 * locations it serves, the mapping is one-directional from Location.
 *
 * Return Orders and Part Orders are single-material-per-row in this pass
 * (not a multi-line-item editor like Billing's invoices) — documented
 * scope decision to ship the full RMA loop (defective/good return →
 * mapped warehouse → replacement dispatch) rather than gold-plate any one
 * piece; multi-item lines are a natural follow-up using the same
 * LineItemsEditor pattern Billing already has.
 */

const WAREHOUSE_STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Inactive: "neutral",
};

export const WAREHOUSE_TYPES = ["Central", "Regional", "Local"] as const;

export const warehouseColumns: Column[] = [
  { key: "id", label: "Warehouse Code", type: "text" },
  { key: "name", label: "Warehouse Name", type: "text" },
  { key: "type", label: "Type", type: "select-chip" },
  { key: "city", label: "City", type: "text" },
  { key: "contactPerson", label: "Contact Person", type: "text" },
  { key: "contactPhone", label: "Contact Phone", type: "phone" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: WAREHOUSE_STATUS_VARIANT },
];

export const warehouseRows: Row[] = [
  {
    id: "WH-001",
    name: "Central Warehouse — Bengaluru",
    type: "Central",
    address: "Plot 14, Electronics City Phase 2",
    pincode: "560100",
    state: "Karnataka",
    city: "Bengaluru",
    contactPerson: "Ramesh Iyer",
    contactPhone: "9845012345",
    status: "Active",
  },
  {
    id: "WH-002",
    name: "Regional Warehouse — Mumbai",
    type: "Regional",
    address: "Unit 8, Andheri MIDC",
    pincode: "400093",
    state: "Maharashtra",
    city: "Mumbai",
    contactPerson: "Sneha Kulkarni",
    contactPhone: "9820098765",
    status: "Active",
  },
  {
    id: "WH-003",
    name: "Local Store — Indiranagar",
    type: "Local",
    address: "100 Feet Road, Indiranagar",
    pincode: "560038",
    state: "Karnataka",
    city: "Bengaluru",
    contactPerson: "Arjun K.",
    contactPhone: "9900112233",
    status: "Active",
  },
];

export const warehouseFormFields: FormFieldDef[] = [
  { key: "id", label: "Warehouse Code", type: "text", required: false },
  { key: "name", label: "Warehouse Name", type: "text", required: true },
  { key: "type", label: "Type", type: "select", required: true, options: [...WAREHOUSE_TYPES] },
  { key: "address", label: "Address", type: "textarea", required: false },
  { key: "pincode", label: "Pincode", type: "text", required: false },
  { key: "state", label: "State", type: "text", required: false },
  { key: "city", label: "City", type: "text", required: true },
  { key: "contactPerson", label: "Contact Person", type: "text", required: false },
  { key: "contactPhone", label: "Contact Phone", type: "phone", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getWarehouseRecord(recordId: string): Row {
  return warehouseRows.find((r) => String(r["id"]) === recordId) ?? warehouseRows[0];
}

export function getWarehouseDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Warehouse Code", value: r["id"], type: "text" },
    { label: "Warehouse Name", value: r["name"], type: "text" },
    { label: "Type", value: r["type"], type: "select" },
    { label: "Address", value: r["address"], type: "text" },
    { label: "Pincode", value: r["pincode"], type: "text" },
    { label: "State", value: r["state"], type: "text" },
    { label: "City", value: r["city"], type: "text" },
    { label: "Contact Person", value: r["contactPerson"], type: "text" },
    { label: "Contact Phone", value: r["contactPhone"], type: "phone" },
    { label: "Status", value: r["status"], type: "select", chipVariant: WAREHOUSE_STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getWarehouseTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Warehouse registered by Inventory Admin — IP 103.21.44.12", timestamp: "2026-05-01T09:00:00", actor: "Inventory Admin" },
  ];
}

export const warehouseRelated: RelatedRecord[] = [];

export function getWarehouseOptions(): { value: string; label: string }[] {
  return warehouseRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}

// ---------------------------------------------------------------------
// Inventory — per-warehouse stock ledger
// ---------------------------------------------------------------------

const STOCK_STATUS_VARIANT: Record<string, StatusVariant> = {
  "In Stock": "success",
  Reserved: "warning",
  Dispatched: "teal",
  Returned: "amber",
};

export const stockColumns: Column[] = [
  { key: "id", label: "Stock ID", type: "text" },
  { key: "materialId", label: "Material", type: "text" },
  { key: "warehouseName", label: "Warehouse", type: "text" },
  { key: "qtyOnHand", label: "Qty on Hand", type: "text" },
  { key: "reservedQty", label: "Reserved Qty", type: "text" },
  { key: "availableQty", label: "Available Qty", type: "text" },
  { key: "reorderLevel", label: "Reorder Level", type: "text" },
  { key: "serialized", label: "Serialized", type: "boolean" },
  { key: "lastUpdated", label: "Last Updated", type: "date" },
];

export const stockRows: Row[] = [
  {
    id: "STK-2001",
    materialId: "MAT-1001 — Samsung Galaxy Display Assembly — A54",
    warehouseId: "WH-001",
    warehouseName: "Central Warehouse — Bengaluru",
    qtyOnHand: 42,
    reservedQty: 6,
    availableQty: 36,
    reorderLevel: 10,
    serialized: false,
    lastUpdated: "2026-08-06",
  },
  {
    id: "STK-2002",
    materialId: "MAT-1002 — Li-ion Battery 4000mAh — Generic",
    warehouseId: "WH-001",
    warehouseName: "Central Warehouse — Bengaluru",
    qtyOnHand: 18,
    reservedQty: 2,
    availableQty: 16,
    reorderLevel: 15,
    serialized: true,
    lastUpdated: "2026-08-07",
  },
  {
    id: "STK-2003",
    materialId: "MAT-1004 — Isopropyl Alcohol Cleaning Solution — 500ml",
    warehouseId: "WH-003",
    warehouseName: "Local Store — Indiranagar",
    qtyOnHand: 30,
    reservedQty: 0,
    availableQty: 30,
    reorderLevel: 5,
    serialized: false,
    lastUpdated: "2026-08-05",
  },
];

export const stockFormFields: FormFieldDef[] = [
  { key: "materialId", label: "Material", type: "select", required: true, options: getBomOptions().map((o) => o.label) },
  { key: "warehouseName", label: "Warehouse", type: "select", required: true, options: getWarehouseOptions().map((o) => o.label) },
  { key: "qtyOnHand", label: "Qty on Hand", type: "number", required: true },
  { key: "reservedQty", label: "Reserved Qty", type: "number", required: false },
  { key: "reorderLevel", label: "Reorder Level", type: "number", required: false },
];

export function getStockRecord(recordId: string): Row {
  return stockRows.find((r) => String(r["id"]) === recordId) ?? stockRows[0];
}

export function getStockDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Stock ID", value: r["id"], type: "text" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "Warehouse", value: r["warehouseName"], type: "text" },
    { label: "Qty on Hand", value: r["qtyOnHand"], type: "text" },
    { label: "Reserved Qty", value: r["reservedQty"], type: "text" },
    { label: "Available Qty", value: r["availableQty"], type: "text" },
    { label: "Reorder Level", value: r["reorderLevel"], type: "text" },
    { label: "Serialized", value: r["serialized"], type: "boolean" },
    { label: "Last Updated", value: r["lastUpdated"], type: "date" },
  ];
}

export function getStockTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Stock entry created from opening balance import", timestamp: "2026-07-01T09:00:00", actor: "Inventory Admin" },
  ];
}

export const stockRelated: RelatedRecord[] = [];

// ---------------------------------------------------------------------
// Stock Adjustments
// ---------------------------------------------------------------------

export const ADJUSTMENT_TYPES = ["Increase", "Decrease"] as const;
export const ADJUSTMENT_REASONS = ["Damaged", "Lost", "Recount", "Initial Stock", "Other"] as const;

export const stockAdjustmentColumns: Column[] = [
  { key: "id", label: "Adjustment ID", type: "text" },
  { key: "warehouseName", label: "Warehouse", type: "text" },
  { key: "materialId", label: "Material", type: "text" },
  { key: "adjustmentType", label: "Type", type: "select-chip" },
  { key: "quantity", label: "Quantity", type: "text" },
  { key: "reason", label: "Reason", type: "text" },
  { key: "adjustedBy", label: "Adjusted By", type: "text" },
  { key: "date", label: "Date", type: "date" },
];

export const stockAdjustmentRows: Row[] = [
  {
    id: "ADJ-3001",
    warehouseName: "Central Warehouse — Bengaluru",
    materialId: "MAT-1002 — Li-ion Battery 4000mAh — Generic",
    adjustmentType: "Decrease",
    quantity: 2,
    reason: "Damaged",
    adjustedBy: "Ramesh Iyer",
    date: "2026-08-04",
  },
  {
    id: "ADJ-3000",
    warehouseName: "Central Warehouse — Bengaluru",
    materialId: "MAT-1001 — Samsung Galaxy Display Assembly — A54",
    adjustmentType: "Increase",
    quantity: 50,
    reason: "Initial Stock",
    adjustedBy: "Ramesh Iyer",
    date: "2026-07-15",
  },
];

export const stockAdjustmentFormFields: FormFieldDef[] = [
  { key: "warehouseName", label: "Warehouse", type: "select", required: true, options: getWarehouseOptions().map((o) => o.label) },
  { key: "materialId", label: "Material", type: "select", required: true, options: getBomOptions().map((o) => o.label) },
  { key: "adjustmentType", label: "Type", type: "select", required: true, options: [...ADJUSTMENT_TYPES] },
  { key: "quantity", label: "Quantity", type: "number", required: true },
  { key: "reason", label: "Reason", type: "select", required: true, options: [...ADJUSTMENT_REASONS] },
  { key: "adjustedBy", label: "Adjusted By", type: "text", required: false },
  { key: "date", label: "Date", type: "date", required: true },
];

// ---------------------------------------------------------------------
// Return Orders — defective/good material sent back from a Service
// Centre location to its mapped Warehouse
// ---------------------------------------------------------------------

export const RETURN_TYPES = ["Defective", "Good"] as const;

const RETURN_STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "warning",
  "In Transit": "teal",
  Received: "success",
  Rejected: "danger",
};

export const returnOrderColumns: Column[] = [
  { key: "id", label: "Return Order ID", type: "text" },
  { key: "workorderRef", label: "Workorder", type: "relation-link" },
  { key: "returnType", label: "Return Type", type: "select-chip" },
  { key: "materialId", label: "Material", type: "text" },
  { key: "quantity", label: "Quantity", type: "text" },
  { key: "sourceLocation", label: "Source Location", type: "text" },
  { key: "destinationWarehouseName", label: "Destination Warehouse", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: RETURN_STATUS_VARIANT },
  { key: "createdDate", label: "Created", type: "date" },
];

export const returnOrderRows: Row[] = [
  {
    id: "RTN-4001",
    workorderRef: "WO202608080002",
    returnType: "Defective",
    materialId: "MAT-1002 — Li-ion Battery 4000mAh — Generic",
    quantity: 1,
    sourceLocation: "Indiranagar Service Centre",
    destinationWarehouseId: "WH-001",
    destinationWarehouseName: "Central Warehouse — Bengaluru",
    status: "In Transit",
    createdDate: "2026-08-07",
    receivedDate: null,
  },
  {
    id: "RTN-4000",
    workorderRef: "WO202608080001",
    returnType: "Good",
    materialId: "MAT-1003 — USB-C Charging Port Flex Cable",
    quantity: 3,
    sourceLocation: "Indiranagar Service Centre",
    destinationWarehouseId: "WH-001",
    destinationWarehouseName: "Central Warehouse — Bengaluru",
    status: "Received",
    createdDate: "2026-08-02",
    receivedDate: "2026-08-04",
  },
];

export const returnOrderFormFields: FormFieldDef[] = [
  { key: "workorderRef", label: "Workorder", type: "text", required: false },
  { key: "returnType", label: "Return Type", type: "select", required: true, options: [...RETURN_TYPES] },
  { key: "materialId", label: "Material", type: "select", required: true, options: getBomOptions().map((o) => o.label) },
  { key: "quantity", label: "Quantity", type: "number", required: true },
  { key: "sourceLocation", label: "Source Location", type: "text", required: true },
  { key: "destinationWarehouseName", label: "Destination Warehouse", type: "select", required: true, options: getWarehouseOptions().map((o) => o.label) },
  { key: "status", label: "Status", type: "select", required: true, options: ["Pending", "In Transit", "Received", "Rejected"] },
  { key: "createdDate", label: "Created Date", type: "date", required: true },
];

export function getReturnOrderRecord(recordId: string): Row {
  return returnOrderRows.find((r) => String(r["id"]) === recordId) ?? returnOrderRows[0];
}

export function getReturnOrderDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Return Order ID", value: r["id"], type: "text" },
    { label: "Workorder", value: r["workorderRef"], type: "relation" },
    { label: "Return Type", value: r["returnType"], type: "text" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "Quantity", value: r["quantity"], type: "text" },
    { label: "Source Location", value: r["sourceLocation"], type: "text" },
    { label: "Destination Warehouse", value: r["destinationWarehouseName"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: RETURN_STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Created Date", value: r["createdDate"], type: "date" },
    { label: "Received Date", value: r["receivedDate"], type: "date" },
  ];
}

export function getReturnOrderTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Return Order created against ${String(record["workorderRef"] ?? "workorder")}`, timestamp: `${record["createdDate"]}T10:00:00`, actor: "Service Centre" },
  ];
}

export const returnOrderRelated: RelatedRecord[] = [];

// ---------------------------------------------------------------------
// Part Orders — Warehouse dispatching replacement material back to a
// Service Centre location, optionally triggered by a Return Order
// ---------------------------------------------------------------------

const PART_ORDER_STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "warning",
  Dispatched: "teal",
  Delivered: "success",
};

export const partOrderColumns: Column[] = [
  { key: "id", label: "Part Order ID", type: "text" },
  { key: "linkedReturnOrderId", label: "Linked Return Order", type: "relation-link" },
  { key: "materialId", label: "Material", type: "text" },
  { key: "quantity", label: "Quantity", type: "text" },
  { key: "sourceWarehouseName", label: "Source Warehouse", type: "text" },
  { key: "destinationLocation", label: "Destination Location", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: PART_ORDER_STATUS_VARIANT },
  { key: "dispatchedDate", label: "Dispatched", type: "date" },
];

export const partOrderRows: Row[] = [
  {
    id: "PO-5001",
    linkedReturnOrderId: "RTN-4001",
    materialId: "MAT-1002 — Li-ion Battery 4000mAh — Generic",
    quantity: 1,
    sourceWarehouseId: "WH-001",
    sourceWarehouseName: "Central Warehouse — Bengaluru",
    destinationLocation: "Indiranagar Service Centre",
    status: "Dispatched",
    dispatchedDate: "2026-08-07",
    deliveredDate: null,
  },
  {
    id: "PO-5000",
    linkedReturnOrderId: null,
    materialId: "MAT-1001 — Samsung Galaxy Display Assembly — A54",
    quantity: 5,
    sourceWarehouseId: "WH-001",
    sourceWarehouseName: "Central Warehouse — Bengaluru",
    destinationLocation: "Indiranagar Service Centre",
    status: "Delivered",
    dispatchedDate: "2026-07-30",
    deliveredDate: "2026-08-01",
  },
];

export const partOrderFormFields: FormFieldDef[] = [
  { key: "linkedReturnOrderId", label: "Linked Return Order (optional)", type: "text", required: false },
  { key: "materialId", label: "Material", type: "select", required: true, options: getBomOptions().map((o) => o.label) },
  { key: "quantity", label: "Quantity", type: "number", required: true },
  { key: "sourceWarehouseName", label: "Source Warehouse", type: "select", required: true, options: getWarehouseOptions().map((o) => o.label) },
  { key: "destinationLocation", label: "Destination Location", type: "text", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Pending", "Dispatched", "Delivered"] },
  { key: "dispatchedDate", label: "Dispatched Date", type: "date", required: false },
];

export function getPartOrderRecord(recordId: string): Row {
  return partOrderRows.find((r) => String(r["id"]) === recordId) ?? partOrderRows[0];
}

export function getPartOrderDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Part Order ID", value: r["id"], type: "text" },
    { label: "Linked Return Order", value: r["linkedReturnOrderId"], type: "relation" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "Quantity", value: r["quantity"], type: "text" },
    { label: "Source Warehouse", value: r["sourceWarehouseName"], type: "text" },
    { label: "Destination Location", value: r["destinationLocation"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: PART_ORDER_STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Dispatched Date", value: r["dispatchedDate"], type: "date" },
    { label: "Delivered Date", value: r["deliveredDate"], type: "date" },
  ];
}

export function getPartOrderTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Part Order created by Warehouse Admin", timestamp: `${record["dispatchedDate"] ?? "2026-08-01"}T09:00:00`, actor: "Warehouse Admin" },
  ];
}

export const partOrderRelated: RelatedRecord[] = [];
