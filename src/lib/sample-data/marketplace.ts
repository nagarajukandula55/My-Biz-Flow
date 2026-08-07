import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Vendor Listing sample data for the marketplace module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Active": "success",
  "Pending Review": "warning",
  "Suspended": "danger"
};

export const marketplaceColumns: Column[] = [
  { key: "id", label: "Vendor Listing ID", type: "text" },
  { key: "vendorName", label: "Vendor Name", type: "relation-link" },
  { key: "category", label: "Category", type: "text" },
  { key: "commissionRate", label: "Commission Rate (%)", type: "text" },
  { key: "monthlyGmv", label: "Monthly GMV", type: "currency" },
  { key: "onboardedDate", label: "Onboarded Date", type: "date" },
  { key: "centralApiVendorId", label: "Central-API Vendor ID", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const marketplaceRows: Row[] = [
  {
    id: "MKT-1101",
    vendorName: "Urban Wicks Candles",
    category: "Home & Decor",
    commissionRate: 12,
    monthlyGmv: 340000,
    onboardedDate: "2026-02-14",
    centralApiVendorId: "CA-VEN-88231",
    status: "Active",
  },
  {
    id: "MKT-1100",
    vendorName: "Spice Route Foods",
    category: "Grocery",
    commissionRate: 8,
    monthlyGmv: 890000,
    onboardedDate: "2025-11-02",
    centralApiVendorId: "CA-VEN-77120",
    status: "Active",
  },
  {
    id: "MKT-1099",
    vendorName: "Loomcraft Textiles",
    category: "Apparel",
    commissionRate: 15,
    monthlyGmv: 0,
    onboardedDate: "2026-08-01",
    centralApiVendorId: "CA-VEN-90344",
    status: "Pending Review",
  },
  {
    id: "MKT-1098",
    vendorName: "Nova Electronics Hub",
    category: "Electronics",
    commissionRate: 10,
    monthlyGmv: 120000,
    onboardedDate: "2025-06-19",
    centralApiVendorId: "CA-VEN-65210",
    status: "Suspended",
  },
];

export const marketplaceFormFields: FormFieldDef[] = [
  { key: "id", label: "Vendor Listing ID", type: "text", required: true },
  { key: "vendorName", label: "Vendor Name", type: "relation", required: true },
  { key: "category", label: "Category", type: "text", required: true },
  { key: "commissionRate", label: "Commission Rate (%)", type: "number", required: true },
  { key: "monthlyGmv", label: "Monthly GMV", type: "currency", required: false },
  { key: "onboardedDate", label: "Onboarded Date", type: "date", required: false },
  { key: "centralApiVendorId", label: "Central-API Vendor ID", type: "text", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Pending Review","Suspended"] },
];

export function getMarketplaceRecord(recordId: string): Row {
  return marketplaceRows.find((r) => String(r["id"]) === recordId) ?? marketplaceRows[0];
}

export function getMarketplaceDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Vendor Listing ID", value: r["id"], type: "text" },
    { label: "Vendor Name", value: r["vendorName"], type: "relation" },
    { label: "Category", value: r["category"], type: "text" },
    { label: "Commission Rate (%)", value: r["commissionRate"], type: "text" },
    { label: "Monthly GMV", value: r["monthlyGmv"], type: "currency" },
    { label: "Onboarded Date", value: r["onboardedDate"], type: "date" },
    { label: "Central-API Vendor ID", value: r["centralApiVendorId"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getMarketplaceTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Vendor listing onboarded and linked to Central-API vendor ID by Karthik N. — IP 103.21.44.25", timestamp: "2026-04-10T10:00:00", actor: "Karthik N." },
    { id: "t2", label: "Commission rate configured for category", timestamp: "2026-04-10T10:15:00", actor: "Marketplace Admin" },
    { id: "t3", label: "Monthly GMV figure recalculated from settled orders", timestamp: "2026-08-01T00:20:00", actor: "System" },
    { id: "t4", label: "Listing status reviewed at quarterly vendor audit", timestamp: "2026-08-04T11:00:00", actor: "Marketplace Admin" },
  ];
}

export const marketplaceRelated: RelatedRecord[] = [];
