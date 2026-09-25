import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import { WHOLESALE_ORDER_STATUSES } from "@/lib/wholesaleData";

// Order field vocabulary for the wholesale-b2b module's main order list —
// now Prisma-backed (WholesaleOrder/WholesaleOrderLine, see
// src/lib/wholesaleData.ts) rather than a BusinessRecord. wholesaleB2bColumns/
// wholesaleB2bFormFields/wholesaleB2bRows are kept exported under these same
// names because src/lib/moduleData.ts and src/lib/designer/fieldSchema.ts
// (generic, module-agnostic registries used by the design-system reference
// page and the Designer's field editor) import them by name.

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Pending": "neutral",
  "Confirmed": "teal",
  "Dispatched": "warning",
  "Delivered": "success",
  "Cancelled": "danger",
};

export { STATUS_VARIANT as wholesaleB2bStatusVariant };

export const wholesaleB2bColumns: Column[] = [
  { key: "orderNumber", label: "Order Number", type: "text" },
  { key: "customerName", label: "Customer", type: "relation-link" },
  { key: "priceTierName", label: "Price Tier", type: "text" },
  { key: "orderDate", label: "Order Date", type: "date" },
  { key: "totalAmount", label: "Total Amount", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

// Static demo rows only for the generic design-system reference page
// (src/lib/moduleData.ts) — the real list page reads live WholesaleOrder
// rows via listWholesaleOrders(), never this array.
export const wholesaleB2bRows: Row[] = [
  {
    id: "WSO-0001",
    orderNumber: "WSO-0001",
    customerName: "Krishna Distributors",
    priceTierName: "Gold",
    orderDate: "2026-08-05",
    totalAmount: 3840,
    status: "Dispatched",
  },
];

export const wholesaleB2bFormFields: FormFieldDef[] = [
  { key: "orderNumber", label: "Order Number", type: "text", required: false },
  { key: "customerId", label: "Customer", type: "relation", required: true },
  { key: "priceTierId", label: "Price Tier", type: "relation", required: false },
  { key: "orderDate", label: "Order Date", type: "date", required: true },
  { key: "totalAmount", label: "Total Amount (computed)", type: "currency", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: [...WHOLESALE_ORDER_STATUSES] },
];

export function getWholesaleB2bDetailFields(row: Row): RecordField[] {
  return [
    { label: "Order Number", value: row["orderNumber"], type: "text" },
    { label: "Customer", value: row["customerName"], type: "relation" },
    { label: "Price Tier", value: row["priceTierName"], type: "text" },
    { label: "Order Date", value: row["orderDate"], type: "date" },
    { label: "Total Amount", value: row["totalAmount"], type: "currency" },
    { label: "Status", value: row["status"], type: "select", chipVariant: STATUS_VARIANT[String(row["status"])] ?? "neutral" },
  ];
}

export function getWholesaleB2bTimeline(): TimelineEntry[] {
  return [];
}

export const wholesaleB2bRelated: RelatedRecord[] = [];
