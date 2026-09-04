import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Partner Listing sample data for the marketplace module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Active": "success",
  "Pending Review": "warning",
  "Suspended": "danger"
};

export const marketplaceColumns: Column[] = [
  { key: "id", label: "Partner Listing ID", type: "text" },
  { key: "partnerName", label: "Partner Name", type: "relation-link" },
  { key: "category", label: "Category", type: "text" },
  { key: "commissionRate", label: "Commission Rate (%)", type: "text" },
  { key: "monthlyGmv", label: "Monthly GMV", type: "currency" },
  { key: "onboardedDate", label: "Onboarded Date", type: "date" },
  { key: "centralApiPartnerId", label: "Central-API Partner ID", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const marketplaceRows: Row[] = [
  {
    id: "MKT-1101",
    partnerName: "Urban Wicks Candles",
    category: "Home & Decor",
    commissionRate: 12,
    monthlyGmv: 340000,
    onboardedDate: "2026-02-14",
    centralApiPartnerId: "CA-VEN-88231",
    status: "Active",
  },
  {
    id: "MKT-1100",
    partnerName: "Spice Route Foods",
    category: "Grocery",
    commissionRate: 8,
    monthlyGmv: 890000,
    onboardedDate: "2025-11-02",
    centralApiPartnerId: "CA-VEN-77120",
    status: "Active",
  },
  {
    id: "MKT-1099",
    partnerName: "Loomcraft Textiles",
    category: "Apparel",
    commissionRate: 15,
    monthlyGmv: 0,
    onboardedDate: "2026-08-01",
    centralApiPartnerId: "CA-VEN-90344",
    status: "Pending Review",
  },
  {
    id: "MKT-1098",
    partnerName: "Nova Electronics Hub",
    category: "Electronics",
    commissionRate: 10,
    monthlyGmv: 120000,
    onboardedDate: "2025-06-19",
    centralApiPartnerId: "CA-VEN-65210",
    status: "Suspended",
  },
];

export const marketplaceFormFields: FormFieldDef[] = [
  { key: "id", label: "Partner Listing ID", type: "text", required: true },
  { key: "partnerName", label: "Partner Name", type: "relation", required: true },
  { key: "category", label: "Category", type: "text", required: true },
  { key: "commissionRate", label: "Commission Rate (%)", type: "number", required: true },
  { key: "monthlyGmv", label: "Monthly GMV", type: "currency", required: false },
  { key: "onboardedDate", label: "Onboarded Date", type: "date", required: false },
  { key: "centralApiPartnerId", label: "Central-API Partner ID", type: "text", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Pending Review","Suspended"] },
];

export function getMarketplaceRecord(recordId: string): Row {
  return marketplaceRows.find((r) => String(r["id"]) === recordId) ?? marketplaceRows[0];
}

// --- Orders, commission calculation, payout lifecycle ----------------------
// Orders are marketplace BusinessRecords too (recordKind: "order"), linked
// to their vendor by vendorId — same generic store, distinguished by a
// field, same idea as Service Centre's single `data` blob just carrying
// more keys. Vendor listings (the rows above) have no recordKind and are
// treated as "vendor" by default.

export type PayoutStatus = "Pending" | "Processing" | "Paid";
export const PAYOUT_STAGES: PayoutStatus[] = ["Pending", "Processing", "Paid"];

export interface MarketplaceOrder {
  id: string;
  recordKind: "order";
  vendorId: string;
  vendorName: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
  payoutStatus: PayoutStatus;
  payoutDate?: string;
  createdAt: string;
}

/** Server-side commission math — never trust a client-submitted total. */
export function computeCommission(saleAmount: number, commissionRate: number): { commissionAmount: number; vendorPayoutAmount: number } {
  const commissionAmount = Math.round(saleAmount * (commissionRate / 100));
  const vendorPayoutAmount = saleAmount - commissionAmount;
  return { commissionAmount, vendorPayoutAmount };
}

export function isMarketplaceOrder(record: Row): record is Row & MarketplaceOrder {
  return record["recordKind"] === "order";
}

export interface VendorPerformance {
  orderCount: number;
  totalSales: number;
  totalCommission: number;
  totalPayout: number;
}

/** Rolls up a vendor's own totals across its orders — other marketplace BusinessRecords filtered by vendorId. */
export function computeVendorPerformance(vendorId: string, allRecords: Row[]): VendorPerformance {
  const orders = allRecords.filter((r) => isMarketplaceOrder(r) && r["vendorId"] === vendorId);
  return orders.reduce<VendorPerformance>(
    (acc, o) => ({
      orderCount: acc.orderCount + 1,
      totalSales: acc.totalSales + Number(o["saleAmount"] ?? 0),
      totalCommission: acc.totalCommission + Number(o["commissionAmount"] ?? 0),
      totalPayout: acc.totalPayout + Number(o["vendorPayoutAmount"] ?? 0),
    }),
    { orderCount: 0, totalSales: 0, totalCommission: 0, totalPayout: 0 }
  );
}

export function getMarketplaceDetailFields(record: Row): RecordField[] {
  const r = record;
  if (isMarketplaceOrder(r)) {
    return [
      { label: "Order ID", value: r["id"], type: "text" },
      { label: "Vendor", value: r["vendorName"], type: "text" },
      { label: "Sale Amount", value: r["saleAmount"], type: "currency" },
      { label: "Commission Rate (%)", value: r["commissionRate"], type: "text" },
      { label: "Commission Amount", value: r["commissionAmount"], type: "currency" },
      { label: "Vendor Payout Amount", value: r["vendorPayoutAmount"], type: "currency" },
      { label: "Payout Status", value: r["payoutStatus"], type: "select" },
      { label: "Payout Date", value: r["payoutDate"], type: "date" },
    ];
  }
  return [
    { label: "Partner Listing ID", value: r["id"], type: "text" },
    { label: "Partner Name", value: r["partnerName"], type: "relation" },
    { label: "Category", value: r["category"], type: "text" },
    { label: "Commission Rate (%)", value: r["commissionRate"], type: "text" },
    { label: "Monthly GMV", value: r["monthlyGmv"], type: "currency" },
    { label: "Onboarded Date", value: r["onboardedDate"], type: "date" },
    { label: "Central-API Partner ID", value: r["centralApiPartnerId"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getMarketplaceTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Partner listing onboarded and linked to Central-API partner ID by Karthik N. — IP 103.21.44.25", timestamp: "2026-04-10T10:00:00", actor: "Karthik N." },
    { id: "t2", label: "Commission rate configured for category", timestamp: "2026-04-10T10:15:00", actor: "Marketplace Admin" },
    { id: "t3", label: "Monthly GMV figure recalculated from settled orders", timestamp: "2026-08-01T00:20:00", actor: "System" },
    { id: "t4", label: "Listing status reviewed at quarterly partner audit", timestamp: "2026-08-04T11:00:00", actor: "Marketplace Admin" },
  ];
}

export const marketplaceRelated: RelatedRecord[] = [];
