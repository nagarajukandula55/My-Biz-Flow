import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getBomOptionsForPartner } from "./bom";
import { getAvailabilityByMaterial } from "@/lib/inventoryStock";

/**
 * Builds a Material select's `options`/`optionLabels` pair with live
 * per-warehouse Available Qty shown next to each material — but the
 * STORED value stays the plain "CODE — Description" label (same as every
 * other materialId field), never the availability-annotated display text.
 * Baking availability straight into `options` would have permanently
 * stored that moment's snapshot (e.g. "MAT-1002 — Battery [Central WH: 16
 * avail]") as the record's actual materialId forever, corrupting every
 * later reader of the field (detail views, materialCode() lookups,
 * CSV export) with stale numbers baked into the text. optionLabels keeps
 * the display-only annotation separate from the stored value.
 */
function withAvailability(
  options: { value: string; label: string }[],
  availability: Map<string, string>
): { options: string[]; optionLabels: Record<string, string> } {
  const optionLabels: Record<string, string> = {};
  for (const o of options) {
    const code = o.label.split(" — ")[0].trim();
    const avail = availability.get(code);
    if (avail) optionLabels[o.label] = `${o.label} [${avail}]`;
  }
  return { options: options.map((o) => o.label), optionLabels };
}

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

/**
 * DEMO/PLACEHOLDER ONLY — see getBomOptions()'s identical caveat in bom.ts.
 * Returns the hardcoded `warehouseRows` above, the same for every partner.
 * Use `getWarehouseOptionsForPartner` for anything actually facing a partner.
 */
export function getWarehouseOptions(): { value: string; label: string }[] {
  return warehouseRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}

/** The real, partner-scoped warehouse list — every Active warehouse THIS partner has actually created, nothing more, nothing less. */
export async function getWarehouseOptionsForPartner(partnerId: string): Promise<{ value: string; label: string }[]> {
  const rows = await listBusinessRecords(partnerId, "inventory-warehouses");
  return rows
    .filter((r) => (r["status"] ?? "Active") === "Active")
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
  // Rows with no `condition` value predate this field and are Good stock —
  // see src/lib/inventoryStock.ts's rowCondition(); every write path this
  // repo controls (adjustStockQty/setStockQty) now stamps it explicitly.
  { key: "condition", label: "Material Type", type: "text" },
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

/** Partner-scoped — see getBomOptionsForPartner/getWarehouseOptionsForPartner. Stock itself has no create form (see inventory/stock/page.tsx's doc comment); this backs only the edit page's Material/Warehouse fields. */
export async function getStockFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const [bomOptions, warehouseOptions] = await Promise.all([
    getBomOptionsForPartner(partnerId),
    getWarehouseOptionsForPartner(partnerId),
  ]);
  return [
    { key: "materialId", label: "Material", type: "select", required: true, options: bomOptions.map((o) => o.label) },
    { key: "warehouseName", label: "Warehouse", type: "select", required: true, options: warehouseOptions.map((o) => o.label) },
    { key: "condition", label: "Material Type", type: "select", required: true, options: ["Good", "Defective"] },
    { key: "qtyOnHand", label: "Qty on Hand", type: "number", required: true },
    { key: "reservedQty", label: "Reserved Qty", type: "number", required: false },
    { key: "reorderLevel", label: "Reorder Level", type: "number", required: false },
  ];
}

export function getStockRecord(recordId: string): Row {
  return stockRows.find((r) => String(r["id"]) === recordId) ?? stockRows[0];
}

export function getStockDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Stock ID", value: r["id"], type: "text" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "Warehouse", value: r["warehouseName"], type: "text" },
    { label: "Material Type", value: r["condition"] || "Good", type: "text" },
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

/** Partner-scoped — see getBomOptionsForPartner/getWarehouseOptionsForPartner's doc comments for why this can't be a plain array. */
export async function getStockAdjustmentFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const [warehouseOptions, bomOptions, availability] = await Promise.all([
    getWarehouseOptionsForPartner(partnerId),
    getBomOptionsForPartner(partnerId),
    getAvailabilityByMaterial(partnerId),
  ]);
  const materialAvailability = withAvailability(bomOptions, availability);
  return [
    { key: "warehouseName", label: "Warehouse", type: "select", required: true, options: warehouseOptions.map((o) => o.label) },
    { key: "materialId", label: "Material — [warehouse: available qty]", type: "select", required: true, options: materialAvailability.options, optionLabels: materialAvailability.optionLabels },
    { key: "adjustmentType", label: "Type", type: "select", required: true, options: [...ADJUSTMENT_TYPES] },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "unitPrice", label: "Unit Price (₹)", type: "number", required: false, help: "Used for the Inventory ledger — Increase posts a debit (value paid in), Decrease posts a credit (value written off)." },
    {
      key: "serialNumbers",
      label: "Serial / Barcode Numbers",
      type: "textarea",
      required: false,
      placeholder: "One serial/barcode per line. Only required if the selected Material is marked Serialized in BOM — count must match Quantity exactly. Leave blank for non-serialized materials.",
    },
    { key: "reason", label: "Reason", type: "select", required: true, options: [...ADJUSTMENT_REASONS] },
    { key: "adjustedBy", label: "Adjusted By", type: "text", required: false },
    { key: "date", label: "Date", type: "date", required: true },
  ];
}

export function getStockAdjustmentDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Adjustment ID", value: r["id"], type: "text" },
    { label: "Warehouse", value: r["warehouseName"], type: "text" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "Type", value: r["adjustmentType"], type: "select" },
    { label: "Quantity", value: r["quantity"], type: "text" },
    { label: "Unit Price (₹)", value: r["unitPrice"] || 0, type: "text" },
    {
      label: "Serial / Barcode Numbers",
      value: Array.isArray(r["serialNumbers"]) && r["serialNumbers"].length > 0 ? r["serialNumbers"].join(", ") : "—",
      type: "text",
    },
    { label: "Reason", value: r["reason"], type: "text" },
    { label: "Adjusted By", value: r["adjustedBy"], type: "text" },
    { label: "Date", value: r["date"], type: "date" },
  ];
}

export function getStockAdjustmentTimeline(record: Row): TimelineEntry[] {
  return [
    {
      id: "t1",
      label: `Stock ${String(record["adjustmentType"] ?? "").toLowerCase()}d by ${record["quantity"]} for ${record["materialId"]} at ${record["warehouseName"]} — reason: ${record["reason"]}`,
      timestamp: `${record["date"] ?? new Date().toISOString().slice(0, 10)}T00:00:00`,
      actor: String(record["adjustedBy"] ?? "System"),
    },
  ];
}

export const stockAdjustmentRelated: RelatedRecord[] = [];

// ---------------------------------------------------------------------
// Return Orders — Inbound: defective/good material sent back from a
// Service Centre location to its mapped Warehouse. Outbound: the ONLY
// way Defective stock is ever allowed to leave the system — a warehouse
// shipping written-off/defective material out to a vendor/OEM (for
// replacement, credit, or scrap), gated on a Challan Number so the
// stock deduction always has real shipping paperwork behind it. No
// Stock Adjustment/Transfer/edit-page path may touch Defective stock —
// see src/app/partner/[partnerId]/inventory/return-orders/actions.ts.
// ---------------------------------------------------------------------

export const RETURN_TYPES = ["Defective", "Good"] as const;
export const RETURN_DIRECTIONS = ["Inbound", "Outbound"] as const;

export const RETURN_STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "warning",
  "In Transit": "teal",
  Received: "success",
  Dispatched: "teal",
  Rejected: "danger",
  Cancelled: "neutral",
};

/** Once a Return Order reaches one of these, its real Stock effect has either already been applied (Received/Dispatched) or it's a closed-out record (Rejected/Cancelled) — editing or cancelling it is no longer allowed from here on. See createReturnOrderAction's doc comment for why this exists (never silently re-apply/duplicate a stock movement, and never let a closed record be reopened). */
export const RETURN_ORDER_FINAL_STATUSES = ["Received", "Dispatched", "Rejected", "Cancelled"] as const;

/**
 * One real, persisted stage transition for a Return Order — same shape
 * convention as service-centre's StageHistoryEntry, plus an `actor` since a
 * Return Order's transitions genuinely happen on different sides of the
 * handoff (Service Centre vs Warehouse) even though this app is single-login
 * — the actor here is a role label, not a real per-user identity. Appended
 * by every stage-transition action in actions.ts, never overwritten. This is
 * the only source getReturnOrderTimeline reads real transitions from.
 */
export interface ReturnOrderStageHistoryEntry {
  /** ISO timestamp of the transition. */
  at: string;
  /** The status the Return Order moved INTO (e.g. "Pending", "In Transit", "Received", "Dispatched", "Rejected", "Cancelled"). */
  stage: string;
  /** Role-ish label for who performed this transition — "Service Centre" or "Warehouse" (no per-user identity in this single-login app). */
  actor: string;
}

/**
 * The stage a given direction's Return Order STARTS at, and the sequence it
 * can move through — see actions.ts's markReturnOrderInTransitAction /
 * warehouseInwardReturnOrderAction / dispatchReturnOrderAction /
 * rejectReturnOrderAction for the actions that walk a record along this:
 *   Inbound (Service Centre -> Warehouse): Pending -> In Transit -> Received
 *     (terminal, stock added), or -> Rejected (terminal, no stock effect)
 *     as an alternate branch from either Pending or In Transit.
 *   Outbound (Warehouse -> Vendor/OEM): Pending -> Dispatched (terminal,
 *     stock deducted), or -> Rejected (terminal, no stock effect) as an
 *     alternate branch. Cancelled remains reachable only via the existing
 *     cancelReturnOrderAction (the "abandon before anything shipped" case),
 *     not a new stage action.
 * "Created" is used as the UI label for the initial Pending stage (matches
 * how the partner actually talks about raising a return) — the stored
 * status value itself stays "Pending" throughout, so RETURN_STATUS_VARIANT/
 * RETURN_ORDER_FINAL_STATUSES/applyReturnOrderStockEffect need no changes.
 */
export const RETURN_ORDER_INITIAL_STATUS = "Pending";

export const returnOrderColumns: Column[] = [
  { key: "id", label: "Return Order ID", type: "text" },
  { key: "direction", label: "Direction", type: "select-chip" },
  { key: "workorderRef", label: "Workorder", type: "relation-link" },
  { key: "returnType", label: "Return Type", type: "select-chip" },
  { key: "materialId", label: "Material", type: "text" },
  { key: "quantity", label: "Quantity", type: "text" },
  { key: "sourceLocation", label: "Source Location", type: "text" },
  { key: "destinationWarehouseName", label: "Destination Warehouse", type: "text" },
  { key: "vendorName", label: "Vendor / OEM", type: "text" },
  { key: "challanNumber", label: "Challan No.", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: RETURN_STATUS_VARIANT },
  { key: "createdDate", label: "Created", type: "date" },
];

export const returnOrderRows: Row[] = [
  {
    id: "RTN-4001",
    direction: "Inbound",
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
    direction: "Inbound",
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

/**
 * Partner-scoped — see getBomOptionsForPartner/getWarehouseOptionsForPartner's
 * doc comments for why this can't be a plain array. One flat form covers
 * both directions (RecordForm has no conditional-field-visibility support);
 * createReturnOrderAction enforces which fields actually matter per
 * direction rather than the field list itself:
 *  - Inbound (Service Centre → Warehouse): Source Location is the SC
 *    location (free text), Destination Warehouse is required, Vendor/OEM
 *    and Challan Number are ignored. Stock is ADDED to the destination
 *    warehouse's Good or Defective bucket (per Return Type) once Received.
 *  - Outbound (Warehouse → Vendor/OEM): Source Location must be one of
 *    this partner's own real warehouse names (validated against
 *    getWarehouseOptionsForPartner, since that's the bucket being
 *    deducted), Return Type is forced to Defective (only Defective stock
 *    is ever allowed to leave this way), Vendor/OEM Name and Challan
 *    Number are both required. Stock is DEDUCTED from that warehouse's
 *    Defective bucket once Dispatched — the only path in the whole app
 *    that can reduce Defective stock.
 */
export async function getReturnOrderFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const [bomOptions, warehouseOptions, availability] = await Promise.all([
    getBomOptionsForPartner(partnerId),
    getWarehouseOptionsForPartner(partnerId),
    getAvailabilityByMaterial(partnerId),
  ]);
  const materialAvailability = withAvailability(bomOptions, availability);
  return [
    { key: "direction", label: "Direction", type: "select", required: true, options: [...RETURN_DIRECTIONS], optionLabels: { Inbound: "Inbound — Service Centre returns material to Warehouse", Outbound: "Outbound — Warehouse ships Defective stock out to a Vendor/OEM" } },
    { key: "workorderRef", label: "Workorder (Inbound only)", type: "text", required: false },
    { key: "returnType", label: "Return Type", type: "select", required: true, options: [...RETURN_TYPES] },
    { key: "materialId", label: "Material — [warehouse: available qty]", type: "select", required: true, options: materialAvailability.options, optionLabels: materialAvailability.optionLabels },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "unitPrice", label: "Unit Price (₹)", type: "number", required: false, help: "Used for the Inventory ledger once this Return Order reaches its final state — Received posts a credit (value/stock coming back), Dispatched posts a debit (value leaving as a write-off)." },
    { key: "sourceLocation", label: "Source Location (Inbound: Service Centre name; Outbound: your own Warehouse name, exactly)", type: "text", required: true },
    { key: "destinationWarehouseName", label: "Destination Warehouse (Inbound only)", type: "select", required: false, options: warehouseOptions.map((o) => o.label) },
    { key: "vendorName", label: "Vendor / OEM Name (Outbound only)", type: "text", required: false },
    { key: "challanNumber", label: "Challan / Delivery Note Number (required for Outbound before stock is deducted)", type: "text", required: false },
    { key: "createdDate", label: "Created Date", type: "date", required: true },
  ];
}

export function getReturnOrderRecord(recordId: string): Row {
  return returnOrderRows.find((r) => String(r["id"]) === recordId) ?? returnOrderRows[0];
}

export function getReturnOrderDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Return Order ID", value: r["id"], type: "text" },
    { label: "Direction", value: r["direction"] || "Inbound", type: "text" },
    { label: "Workorder", value: r["workorderRef"], type: "relation" },
    { label: "Return Type", value: r["returnType"], type: "text" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "Quantity", value: r["quantity"], type: "text" },
    { label: "Unit Price (₹)", value: r["unitPrice"] || 0, type: "text" },
    { label: "Source Location", value: r["sourceLocation"], type: "text" },
    { label: "Destination Warehouse", value: r["destinationWarehouseName"] || "—", type: "text" },
    { label: "Vendor / OEM", value: r["vendorName"] || "—", type: "text" },
    { label: "Challan / Delivery Note No.", value: r["challanNumber"] || "—", type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: RETURN_STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Created Date", value: r["createdDate"], type: "date" },
    { label: "Received Date", value: r["receivedDate"], type: "date" },
  ];
}

/**
 * Renders from the record's real, persisted `stageHistory`
 * (ReturnOrderStageHistoryEntry[]) — appended to by every stage-transition
 * action in actions.ts, never overwritten. Falls back to synthesizing a
 * single "created" entry from the static direction/createdDate fields when
 * `stageHistory` is empty, so the two hand-authored sample rows (RTN-4000/
 * RTN-4001, which predate this field) and any other pre-existing record
 * still render something sensible instead of an empty timeline.
 */
export function getReturnOrderTimeline(record: Row): TimelineEntry[] {
  const history = (record["stageHistory"] as ReturnOrderStageHistoryEntry[] | undefined) ?? [];
  if (history.length > 0) {
    return history.map((h, i) => ({
      id: `stage-${i}`,
      label: `Marked ${h.stage === "Pending" ? "Created" : h.stage}`,
      timestamp: h.at,
      actor: h.actor,
    }));
  }

  if (record["direction"] === "Outbound") {
    return [
      {
        id: "t1",
        label: `Outbound Return Order created — ${String(record["quantity"] ?? "")} x ${String(record["materialId"] ?? "")} to ${String(record["vendorName"] ?? "vendor")}${record["challanNumber"] ? ` (Challan ${record["challanNumber"]})` : ""}`,
        timestamp: `${record["createdDate"]}T10:00:00`,
        actor: "Warehouse",
      },
    ];
  }
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

/** Partner-scoped — see getBomOptionsForPartner/getWarehouseOptionsForPartner's doc comments for why this can't be a plain array. */
export async function getPartOrderFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const [bomOptions, warehouseOptions, availability] = await Promise.all([
    getBomOptionsForPartner(partnerId),
    getWarehouseOptionsForPartner(partnerId),
    getAvailabilityByMaterial(partnerId),
  ]);
  const materialAvailability = withAvailability(bomOptions, availability);
  return [
    { key: "linkedReturnOrderId", label: "Linked Return Order (optional)", type: "text", required: false },
    { key: "materialId", label: "Material — [warehouse: available qty]", type: "select", required: true, options: materialAvailability.options, optionLabels: materialAvailability.optionLabels },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "unitPrice", label: "Unit Price (₹)", type: "number", required: false, help: "Used for the Inventory ledger once this Part Order reaches Delivered — posts a debit (money spent on parts received)." },
    { key: "sourceWarehouseName", label: "Source Warehouse", type: "select", required: true, options: warehouseOptions.map((o) => o.label) },
    { key: "destinationLocation", label: "Destination Location", type: "text", required: true },
    { key: "status", label: "Status", type: "select", required: true, options: ["Pending", "Dispatched", "Delivered"] },
    {
      key: "serialNumbers",
      label: "Serial / Barcode Numbers",
      type: "textarea",
      required: false,
      placeholder: "One serial/barcode per line. Only required once Status is Dispatched/Delivered AND the selected Material is Serialized in BOM — count must match Quantity exactly. Leave blank for non-serialized materials.",
    },
    { key: "dispatchedDate", label: "Dispatched Date", type: "date", required: false },
  ];
}

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
    { label: "Unit Price (₹)", value: r["unitPrice"] || 0, type: "text" },
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

// ---------------------------------------------------------------------
// Stock Transfers — moving material between two of this partner's own
// warehouses (not the Warehouse<->Service-Centre-location flow Return/Part
// Orders cover)
// ---------------------------------------------------------------------

// "Pending Super Admin Approval"/"Rejected" only ever apply to a
// cross-partner transfer (toPartnerId set to a different partner) — an
// intra-partner (own-warehouse-to-own-warehouse) transfer never touches
// them, same Pending -> In Transit -> Completed flow as before. See
// createStockTransferAction (actions.ts) for where the gate is enforced.
export const STOCK_TRANSFER_STATUSES = ["Pending", "In Transit", "Completed", "Pending Super Admin Approval", "Rejected"] as const;

const STOCK_TRANSFER_STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "warning",
  "In Transit": "teal",
  Completed: "success",
  "Pending Super Admin Approval": "warning",
  Rejected: "danger",
};

export const stockTransferColumns: Column[] = [
  { key: "id", label: "Transfer ID", type: "text" },
  { key: "fromWarehouseName", label: "From Warehouse", type: "text" },
  { key: "toWarehouseName", label: "To Warehouse", type: "text" },
  { key: "toPartnerId", label: "To Partner", type: "text" },
  { key: "lineCount", label: "Lines", type: "text" },
  { key: "transferDate", label: "Transfer Date", type: "date" },
  { key: "reason", label: "Reason / Note", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STOCK_TRANSFER_STATUS_VARIANT },
];

/**
 * A own-warehouse transfer document's line item shape (see
 * createOwnWarehouseTransferCore, stock-transfers/actions.ts) — condition-
 * aware (matches src/lib/inventoryStock.ts's StockCondition bucket) and
 * carries its own unit cost for the ledger's no-net-effect movement row.
 * A partner-to-partner transfer never has `lineItems` — it stays on the
 * original flat materialId/quantity/serialNumbers shape untouched.
 */
export type StockTransferLineItem = {
  materialId: string;
  quantity: number;
  condition: "Good" | "Defective";
  /** Rupees. */
  unitPrice: number;
  serialNumbers: string[];
};

/** Partner-scoped — see getBomOptionsForPartner/getWarehouseOptionsForPartner's doc comments for why this can't be a plain array. */
export async function getStockTransferFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const [bomOptions, warehouseOptions, availability] = await Promise.all([
    getBomOptionsForPartner(partnerId),
    getWarehouseOptionsForPartner(partnerId),
    getAvailabilityByMaterial(partnerId),
  ]);
  const materialAvailability = withAvailability(bomOptions, availability);
  return [
    { key: "materialId", label: "Material — [warehouse: available qty]", type: "select", required: true, options: materialAvailability.options, optionLabels: materialAvailability.optionLabels },
    { key: "fromWarehouseName", label: "From Warehouse", type: "select", required: true, options: warehouseOptions.map((o) => o.label) },
    { key: "toWarehouseName", label: "To Warehouse (leave blank for a partner-to-partner transfer)", type: "select", required: false, options: warehouseOptions.map((o) => o.label) },
    { key: "toPartnerId", label: "OR Transfer To Partner ID (e.g. SC0042) — requires Super Admin approval", type: "text", required: false },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "condition", label: "Material Type", type: "select", required: false, options: ["Good", "Defective"], help: "Own-warehouse transfer lines only — which bucket is moving." },
    { key: "unitPrice", label: "Unit Price (₹)", type: "number", required: false, help: "Own-warehouse transfer lines only — used for the ledger's no-net-effect movement row." },
    {
      key: "serialNumbers",
      label: "Serial / Barcode Numbers",
      type: "textarea",
      required: false,
      placeholder: "One serial/barcode per line. Only required for an own-warehouse transfer (moves stock only once the Reconcile OTP is verified — see the transfer's detail page) of a material that's Serialized in BOM — count must match Quantity exactly. Leave blank for non-serialized materials or a partner-to-partner transfer (captured once Super Admin approves it).",
    },
    { key: "transferDate", label: "Transfer Date", type: "date", required: true },
    { key: "reason", label: "Reason / Note", type: "text", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: [...STOCK_TRANSFER_STATUSES] },
  ];
}

export function getStockTransferDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Transfer ID", value: r["id"], type: "text" },
    { label: "Material", value: r["materialId"], type: "text" },
    { label: "From Warehouse", value: r["fromWarehouseName"], type: "text" },
    { label: "To Warehouse", value: r["toWarehouseName"] || "—", type: "text" },
    { label: "To Partner", value: r["toPartnerId"] || "—", type: "text" },
    { label: "Quantity", value: r["quantity"], type: "text" },
    {
      label: "Serial / Barcode Numbers",
      value: Array.isArray(r["serialNumbers"]) && r["serialNumbers"].length > 0 ? r["serialNumbers"].join(", ") : "—",
      type: "text",
    },
    { label: "Transfer Date", value: r["transferDate"], type: "date" },
    { label: "Reason / Note", value: r["reason"], type: "text" },
    {
      label: "Status",
      value: r["status"],
      type: "select",
      chipVariant: STOCK_TRANSFER_STATUS_VARIANT[String(r["status"])] ?? "neutral",
    },
  ];
}

export function getStockTransferTimeline(record: Row): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: "t1",
      label: record["toPartnerId"]
        ? `Partner-to-partner transfer requested to ${record["toPartnerId"]}`
        : "Transfer created",
      timestamp: `${record["transferDate"] ?? "2026-09-19"}T09:00:00`,
      actor: "Partner",
    },
  ];
  if (record["status"] === "Pending Super Admin Approval") {
    entries.push({ id: "t2", label: "Awaiting Super Admin approval", timestamp: `${record["transferDate"] ?? "2026-09-19"}T09:00:01`, actor: "System" });
  }
  return entries;
}

export const stockTransferRelated: RelatedRecord[] = [];

// ---------------------------------------------------------------------
// Stock Take — periodic physical count reconciled against the system's
// expected quantity for a material/warehouse
// ---------------------------------------------------------------------

export const STOCK_TAKE_STATUSES = ["Pending", "Reconciled"] as const;

const STOCK_TAKE_STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "warning",
  Reconciled: "success",
};

/**
 * One "inventory-stock-take" BusinessRecord is now a whole physical-count
 * document (header + one row per material counted), not a single
 * material/warehouse line — see the module's actions.ts. `lineItems` is the
 * authoritative source for what was counted; these top-level columns are
 * document-level (shared header + a couple of summary figures for the list
 * view), not per-material fields any more.
 */
export const stockTakeColumns: Column[] = [
  { key: "id", label: "Stock Take ID", type: "text" },
  { key: "warehouseName", label: "Warehouse", type: "text" },
  { key: "lineCount", label: "Lines", type: "text" },
  { key: "netVariance", label: "Net Variance (Qty)", type: "text" },
  { key: "countedDate", label: "Counted Date", type: "date" },
  { key: "countedBy", label: "Counted By", type: "text" },
  { key: "note", label: "Note", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STOCK_TAKE_STATUS_VARIANT },
];

export type StockTakeLineItem = {
  materialId: string;
  condition: "Good" | "Defective";
  expectedQty: number;
  countedQty: number;
  variance: number;
  /** Rupees. */
  unitPrice: number;
  serialNumbers: string[];
};

/**
 * Header-only fields for the new/edit form — the per-row Material/Expected
 * Qty/Counted Qty/Material Type/Unit Price/Serials now live in
 * MaterialLineItemsTable (see StockTakeNewButton.tsx), not this list.
 * Status is never one of these — a Stock Take always starts "Pending" and
 * only moves via the OTP-gated Reconcile action (actions.ts), never a form
 * field (same lock Return Orders' status uses).
 */
export async function getStockTakeFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const warehouseOptions = await getWarehouseOptionsForPartner(partnerId);
  return [
    { key: "warehouseName", label: "Warehouse", type: "select", required: true, options: warehouseOptions.map((o) => o.label) },
    { key: "countedDate", label: "Counted Date", type: "date", required: true },
    { key: "countedBy", label: "Counted By", type: "text", required: false },
    { key: "note", label: "Note", type: "text", required: false },
  ];
}

/** Same partner-scoped material options MaterialLineItemsTable needs — re-exported here so the page/button don't reach into bom.ts directly. */
export async function getStockTakeMaterialOptions(partnerId: string) {
  return getBomOptionsForPartner(partnerId);
}

/**
 * CSV bulk-import only (see stock-take/actions.ts's bulkImportStockTakeAction)
 * — bulk import stays single-line-per-row (one material per CSV row, same
 * scope decision the original file made), so it needs the full header +
 * line-item field set for column matching, unlike getStockTakeFormFields
 * (header-only, for the new multi-line modal).
 */
export async function getStockTakeCsvFields(partnerId: string): Promise<FormFieldDef[]> {
  const [bomOptions, warehouseOptions, availability] = await Promise.all([
    getBomOptionsForPartner(partnerId),
    getWarehouseOptionsForPartner(partnerId),
    getAvailabilityByMaterial(partnerId),
  ]);
  const materialAvailability = withAvailability(bomOptions, availability);
  return [
    { key: "materialId", label: "Material — [warehouse: available qty]", type: "select", required: true, options: materialAvailability.options, optionLabels: materialAvailability.optionLabels },
    { key: "warehouseName", label: "Warehouse", type: "select", required: true, options: warehouseOptions.map((o) => o.label) },
    { key: "condition", label: "Material Type", type: "select", required: true, options: ["Good", "Defective"] },
    { key: "expectedQty", label: "Expected Qty", type: "number", required: true },
    { key: "countedQty", label: "Counted Qty", type: "number", required: true },
    { key: "unitPrice", label: "Unit Price (₹)", type: "number", required: false },
    { key: "serialNumbers", label: "Serial / Barcode Numbers", type: "textarea", required: false },
    { key: "countedDate", label: "Counted Date", type: "date", required: true },
    { key: "countedBy", label: "Counted By", type: "text", required: false },
    { key: "note", label: "Note", type: "text", required: false },
  ];
}
