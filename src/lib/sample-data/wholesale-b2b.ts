import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Order sample data for the wholesale-b2b module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Placed": "neutral",
  "Approved": "teal",
  "Dispatched": "warning",
  "Delivered": "success",
  "On credit hold": "danger"
};

export const wholesaleB2bColumns: Column[] = [
  { key: "id", label: "Order ID", type: "text" },
  { key: "dealerName", label: "Dealer / Distributor", type: "relation-link" },
  { key: "orderDate", label: "Order Date", type: "date" },
  { key: "itemsSummary", label: "Items", type: "text" },
  { key: "bulkPriceTotal", label: "Bulk Price Total", type: "currency" },
  { key: "creditTermDays", label: "Credit Term (days)", type: "text" },
  { key: "creditLimit", label: "Credit Limit", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const wholesaleB2bRows: Row[] = [
  {
    id: "WSO-8801",
    dealerName: "Krishna Distributors",
    orderDate: "2026-08-05",
    itemsSummary: "Cooking Oil 15L Tin x120, Detergent 5kg x200",
    bulkPriceTotal: 384000,
    creditTermDays: 30,
    creditLimit: 1000000,
    status: "Dispatched",
  },
  {
    id: "WSO-8800",
    dealerName: "Shree Balaji Traders",
    orderDate: "2026-08-02",
    itemsSummary: "Rice 25kg Bag x500",
    bulkPriceTotal: 675000,
    creditTermDays: 15,
    creditLimit: 500000,
    status: "On credit hold",
  },
  {
    id: "WSO-8799",
    dealerName: "Metro Wholesale Hub",
    orderDate: "2026-07-30",
    itemsSummary: "Assorted Biscuits — mixed cartons x300",
    bulkPriceTotal: 210000,
    creditTermDays: 45,
    creditLimit: 800000,
    status: "Delivered",
  },
  {
    id: "WSO-8798",
    dealerName: "Krishna Distributors",
    orderDate: "2026-08-07",
    itemsSummary: "Tea Powder 1kg x400",
    bulkPriceTotal: 96000,
    creditTermDays: 30,
    creditLimit: 1000000,
    status: "Approved",
  },
];

export const wholesaleB2bFormFields: FormFieldDef[] = [
  { key: "id", label: "Order ID", type: "text", required: true },
  { key: "dealerName", label: "Dealer / Distributor", type: "relation", required: true },
  { key: "orderDate", label: "Order Date", type: "date", required: true },
  { key: "itemsSummary", label: "Items", type: "textarea", required: true },
  { key: "bulkPriceTotal", label: "Bulk Price Total", type: "currency", required: true },
  { key: "creditTermDays", label: "Credit Term (days)", type: "number", required: false },
  { key: "creditLimit", label: "Credit Limit", type: "currency", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Placed","Approved","Dispatched","Delivered","On credit hold"] },
];

export function getWholesaleB2bRecord(recordId: string): Row {
  return wholesaleB2bRows.find((r) => String(r["id"]) === recordId) ?? wholesaleB2bRows[0];
}

export function getWholesaleB2bDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Order ID", value: r["id"], type: "text" },
    { label: "Dealer / Distributor", value: r["dealerName"], type: "relation" },
    { label: "Order Date", value: r["orderDate"], type: "date" },
    { label: "Items", value: r["itemsSummary"], type: "text" },
    { label: "Bulk Price Total", value: r["bulkPriceTotal"], type: "currency" },
    { label: "Credit Term (days)", value: r["creditTermDays"], type: "text" },
    { label: "Credit Limit", value: r["creditLimit"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getWholesaleB2bTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["orderDate"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const wholesaleB2bRelated: RelatedRecord[] = [];
