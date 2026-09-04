import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Order sample data for the restaurant-pos module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Placed": "teal",
  "In kitchen": "warning",
  "Served": "amber",
  "Billed": "success",
  "Cancelled": "danger"
};

export const restaurantPosColumns: Column[] = [
  { key: "id", label: "KOT Number", type: "text" },
  { key: "tableNumber", label: "Table Number", type: "text" },
  { key: "waiter", label: "Waiter", type: "text" },
  { key: "items", label: "Items", type: "text" },
  { key: "courseStage", label: "Course Stage", type: "select-chip" },
  { key: "orderTotal", label: "Order Total", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "orderTime", label: "Order Time", type: "date" },
];

export const restaurantPosRows: Row[] = [
  {
    id: "KOT-4421",
    tableNumber: "T-12",
    waiter: "Ganesh P.",
    items: "Paneer Tikka x1, Butter Naan x3, Dal Makhani x1",
    courseStage: "Mains",
    orderTotal: 1240,
    status: "In kitchen",
    orderTime: "2026-08-07T13:05:00",
  },
  {
    id: "KOT-4420",
    tableNumber: "T-04",
    waiter: "Lakshmi V.",
    items: "Masala Dosa x2, Filter Coffee x2",
    courseStage: "Starters",
    orderTotal: 480,
    status: "Served",
    orderTime: "2026-08-07T12:40:00",
  },
  {
    id: "KOT-4419",
    tableNumber: "T-08",
    waiter: "Ganesh P.",
    items: "Chicken Biryani x1, Raita x1",
    courseStage: "Mains",
    orderTotal: 520,
    status: "Billed",
    orderTime: "2026-08-07T12:10:00",
  },
  {
    id: "KOT-4418",
    tableNumber: "T-01",
    waiter: "Divakar R.",
    items: "Gulab Jamun x2",
    courseStage: "Dessert",
    orderTotal: 160,
    status: "Cancelled",
    orderTime: "2026-08-07T11:55:00",
  },
];

export const restaurantPosFormFields: FormFieldDef[] = [
  { key: "id", label: "KOT Number", type: "text", required: true },
  { key: "tableNumber", label: "Table Number", type: "text", required: true },
  { key: "waiter", label: "Waiter", type: "text", required: true },
  { key: "items", label: "Items", type: "textarea", required: true },
  { key: "courseStage", label: "Course Stage", type: "select", required: false, options: ["Starters","Mains","Dessert"] },
  { key: "orderTotal", label: "Order Total", type: "currency", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Placed","In kitchen","Served","Billed","Cancelled"] },
  { key: "orderTime", label: "Order Time", type: "date", required: false },
];

export function getRestaurantPosRecord(recordId: string): Row {
  return restaurantPosRows.find((r) => String(r["id"]) === recordId) ?? restaurantPosRows[0];
}

export function getRestaurantPosDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "KOT Number", value: r["id"], type: "text" },
    { label: "Table Number", value: r["tableNumber"], type: "text" },
    { label: "Waiter", value: r["waiter"], type: "text" },
    { label: "Items", value: r["items"], type: "text" },
    { label: "Course Stage", value: r["courseStage"], type: "select", chipVariant: STATUS_VARIANT[String(r["courseStage"])] ?? "neutral" },
    { label: "Order Total", value: r["orderTotal"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Order Time", value: r["orderTime"], type: "date" },
  ];
}

export function getRestaurantPosTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Order placed at table by Waiter — IP 103.21.44.13", timestamp: "2026-08-07T19:05:00", actor: "Waiter" },
    { id: "t2", label: "KOT sent to kitchen display", timestamp: "2026-08-07T19:05:05", actor: "System" },
    { id: "t3", label: "Order served to table by Waiter — IP 103.21.44.13", timestamp: "2026-08-07T19:22:00", actor: "Waiter" },
    { id: "t4", label: "Bill generated and payment settled — IP 103.21.44.13", timestamp: "2026-08-07T19:48:00", actor: "Waiter" },
  ];
}

export const restaurantPosRelated: RelatedRecord[] = [];

// ---------------------------------------------------------------------------
// Real KOT + table-management domain model (deepened pass — mirrors the
// pattern used by pos.ts's computeSaleTotals / SaleLine / PosSale, adapted to
// this module's own line-item shape: a menu item, qty, price, tax rate, and
// a per-line "KOT sent" flag so front-of-house and kitchen see different
// states off the same order).
// ---------------------------------------------------------------------------

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  taxRate: number; // %
  category: "Starters" | "Mains" | "Beverages" | "Dessert";
};

/** Static menu catalog — this module is self-contained, it does not read Inventory. */
export const restaurantMenuItems: MenuItem[] = [
  { id: "M-01", name: "Paneer Tikka", price: 280, taxRate: 5, category: "Starters" },
  { id: "M-02", name: "Chicken 65", price: 320, taxRate: 5, category: "Starters" },
  { id: "M-03", name: "Masala Dosa", price: 140, taxRate: 5, category: "Mains" },
  { id: "M-04", name: "Butter Naan", price: 60, taxRate: 5, category: "Mains" },
  { id: "M-05", name: "Dal Makhani", price: 220, taxRate: 5, category: "Mains" },
  { id: "M-06", name: "Chicken Biryani", price: 340, taxRate: 5, category: "Mains" },
  { id: "M-07", name: "Raita", price: 60, taxRate: 5, category: "Mains" },
  { id: "M-08", name: "Filter Coffee", price: 60, taxRate: 5, category: "Beverages" },
  { id: "M-09", name: "Fresh Lime Soda", price: 90, taxRate: 12, category: "Beverages" },
  { id: "M-10", name: "Gulab Jamun", price: 80, taxRate: 5, category: "Dessert" },
];

/** Static table list — no separate "tables" business-record type, just a fixed floor plan. */
export const restaurantTables: string[] = [
  "T-01", "T-02", "T-03", "T-04", "T-05", "T-06",
  "T-07", "T-08", "T-09", "T-10", "T-11", "T-12",
];

export type OrderLine = {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  /** True once this line has been sent to the kitchen — locked from removal, still visible for re-ordering more of the same item. */
  kotSent: boolean;
};

export type RestaurantOrderStatus = "Open" | "In kitchen" | "Served" | "Billed" | "Cancelled";

export type RestaurantOrder = {
  id: string;
  tableNumber: string;
  waiter?: string;
  lines: OrderLine[];
  covers: number;
  status: RestaurantOrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  orderTime?: string;
  kotSentAt?: string;
  billedAt?: string;
  cancelReason?: string;
  invoiceIds?: string[];
};

/** Server-computed from order lines — never trust client-submitted totals. */
export function computeOrderTotals(lines: OrderLine[]): { subtotal: number; taxAmount: number; totalAmount: number } {
  let subtotal = 0;
  let taxAmount = 0;
  for (const line of lines) {
    const gross = line.qty * line.unitPrice;
    subtotal += gross;
    taxAmount += gross * ((line.taxRate || 0) / 100);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: round(subtotal), taxAmount: round(taxAmount), totalAmount: round(subtotal + taxAmount) };
}

export function extractOrderFromRecord(record: Row): RestaurantOrder {
  const lines = (record["lines"] as OrderLine[] | undefined) ?? [];
  const totals = computeOrderTotals(lines);
  return {
    id: String(record["id"]),
    tableNumber: String(record["tableNumber"] ?? ""),
    waiter: record["waiter"] as string | undefined,
    lines,
    covers: Number(record["covers"] ?? 1),
    status: (record["status"] as RestaurantOrderStatus | undefined) ?? "Open",
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    orderTime: record["orderTime"] as string | undefined,
    kotSentAt: record["kotSentAt"] as string | undefined,
    billedAt: record["billedAt"] as string | undefined,
    cancelReason: record["cancelReason"] as string | undefined,
    invoiceIds: (record["invoiceIds"] as string[] | undefined) ?? [],
  };
}

/** An order is "occupying" its table until it's Billed or Cancelled. */
export function isOrderOpenForTable(status: RestaurantOrderStatus): boolean {
  return status !== "Billed" && status !== "Cancelled";
}
