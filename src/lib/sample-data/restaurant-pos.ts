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
    { id: "t1", label: "Record created", timestamp: String(record["orderTime"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const restaurantPosRelated: RelatedRecord[] = [];
