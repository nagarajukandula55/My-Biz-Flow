import type { Column, Row } from "@/components/DataTable";
import type { RecordField } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import { paiseToRupees, type MarketplaceOrderRow } from "@/lib/marketplace";

// Field vocabulary for the Marketplace "Orders" pages (MarketplaceOrder,
// Prisma-backed — see src/lib/marketplace.ts).

export const MARKETPLACE_ORDER_STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "warning",
  Confirmed: "teal",
  Shipped: "amber",
  Delivered: "success",
  Cancelled: "danger",
};

export const marketplaceOrderColumns: Column[] = [
  { key: "listingTitle", label: "Listing", type: "relation-link" },
  { key: "customerName", label: "Customer", type: "text" },
  { key: "quantity", label: "Qty", type: "text" },
  { key: "totalAmount", label: "Total Amount", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: MARKETPLACE_ORDER_STATUS_VARIANT },
];

export function marketplaceOrderToRow(o: MarketplaceOrderRow): Row {
  return {
    id: o.id,
    listingTitle: o.listingTitle,
    customerName: o.customerName,
    customerContact: o.customerContact ?? "",
    quantity: o.quantity,
    totalAmount: paiseToRupees(o.totalAmount),
    status: o.status,
    orderedAt: o.orderedAt.toISOString(),
  };
}

export function getMarketplaceOrderDetailFields(row: Row): RecordField[] {
  return [
    { label: "Listing", value: row["listingTitle"], type: "text" },
    { label: "Customer Name", value: row["customerName"], type: "text" },
    { label: "Customer Contact", value: row["customerContact"], type: "text" },
    { label: "Quantity", value: row["quantity"], type: "text" },
    { label: "Total Amount", value: row["totalAmount"], type: "currency" },
    { label: "Status", value: row["status"], type: "select", chipVariant: MARKETPLACE_ORDER_STATUS_VARIANT[String(row["status"])] ?? "neutral" },
    { label: "Ordered At", value: row["orderedAt"], type: "date" },
  ];
}
