import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Location sample data for the brand module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Active": "success",
  "Onboarding": "warning",
  "Suspended": "danger"
};

export const brandColumns: Column[] = [
  { key: "id", label: "Location ID", type: "text" },
  { key: "brandName", label: "Brand", type: "relation-link" },
  { key: "partnerName", label: "Partner", type: "text" },
  { key: "locationName", label: "Location Name", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "modulesEnabled", label: "Modules Enabled", type: "text" },
  { key: "monthlyRevenue", label: "Monthly Revenue", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "openedDate", label: "Opened Date", type: "date" },
];

export const brandRows: Row[] = [
  {
    id: "LOC-014",
    brandName: "Café Meridian",
    partnerName: "Meridian South Pvt Ltd",
    locationName: "Meridian — Indiranagar",
    city: "Bengaluru",
    modulesEnabled: "Restaurant POS, Inventory, Loyalty",
    monthlyRevenue: 1180000,
    status: "Active",
    openedDate: "2024-03-11",
  },
  {
    id: "LOC-013",
    brandName: "Café Meridian",
    partnerName: "Meridian West Pvt Ltd",
    locationName: "Meridian — Andheri",
    city: "Mumbai",
    modulesEnabled: "Restaurant POS, Inventory",
    monthlyRevenue: 940000,
    status: "Active",
    openedDate: "2024-08-02",
  },
  {
    id: "LOC-012",
    brandName: "FitZone Gyms",
    partnerName: "FitZone Pune LLP",
    locationName: "FitZone — Baner",
    city: "Pune",
    modulesEnabled: "Subscriptions, HRMS",
    monthlyRevenue: 610000,
    status: "Onboarding",
    openedDate: "2026-07-20",
  },
  {
    id: "LOC-011",
    brandName: "FitZone Gyms",
    partnerName: "FitZone Delhi LLP",
    locationName: "FitZone — Saket",
    city: "New Delhi",
    modulesEnabled: "Subscriptions, HRMS, Loyalty",
    monthlyRevenue: 0,
    status: "Suspended",
    openedDate: "2023-11-05",
  },
];

export const brandFormFields: FormFieldDef[] = [
  { key: "id", label: "Location ID", type: "text", required: true },
  { key: "brandName", label: "Brand", type: "relation", required: true },
  { key: "partnerName", label: "Partner", type: "text", required: false },
  { key: "locationName", label: "Location Name", type: "text", required: true },
  { key: "city", label: "City", type: "text", required: true },
  { key: "modulesEnabled", label: "Modules Enabled", type: "textarea", required: false },
  { key: "monthlyRevenue", label: "Monthly Revenue", type: "currency", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Onboarding","Suspended"] },
  { key: "openedDate", label: "Opened Date", type: "date", required: false },
];

export function getBrandRecord(recordId: string): Row {
  return brandRows.find((r) => String(r["id"]) === recordId) ?? brandRows[0];
}

export function getBrandDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Location ID", value: r["id"], type: "text" },
    { label: "Brand", value: r["brandName"], type: "relation" },
    { label: "Partner", value: r["partnerName"], type: "text" },
    { label: "Location Name", value: r["locationName"], type: "text" },
    { label: "City", value: r["city"], type: "text" },
    { label: "Modules Enabled", value: r["modulesEnabled"], type: "text" },
    { label: "Monthly Revenue", value: r["monthlyRevenue"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Opened Date", value: r["openedDate"], type: "date" },
  ];
}

export function getBrandTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["openedDate"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const brandRelated: RelatedRecord[] = [];
