import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import { getWarehouseOptionsForPartner } from "./warehouse";
import { paiseToRupees, type BrandRow, type BrandRollup, type LocationRow } from "@/lib/brandData";

// Field vocabulary for the Brand module (Brand + Location, Prisma-backed —
// see src/lib/brandData.ts). Real backend as of the 2026-09-25 second-pass
// migration; this file used to hold the whole demo dataset itself when the
// module was BusinessRecord-backed — it now only holds column/field
// definitions and Row-shape converters, mirroring wholesaleCustomers.ts's
// pattern.

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Onboarding: "warning",
  Suspended: "danger",
};

export const BRAND_STATUSES = ["Active", "Onboarding", "Suspended"] as const;

/* ------------------------------------------------------------------ *
 * Brand
 * ------------------------------------------------------------------ */

export const brandColumns: Column[] = [
  { key: "name", label: "Brand", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
  { key: "createdAt", label: "Created", type: "date" },
];

export const brandFormFields: FormFieldDef[] = [
  { key: "name", label: "Brand Name", type: "text", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

// Static demo rows only for the generic design-system reference page
// (src/lib/moduleData.ts) — the real list page reads live Brand rows via
// listBrands(), never this array. Kept exported under this same name
// because moduleData.ts/fieldSchema.ts import it by name (see
// wholesale-b2b.ts's identical convention after its own Prisma conversion).
export const brandRows: Row[] = [
  { id: "demo-brand-1", name: "Café Meridian", isActive: true, createdAt: "2024-03-11" },
];

export function brandToRow(b: BrandRow): Row {
  return {
    id: b.id,
    name: b.name,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString().slice(0, 10),
  };
}

export function getBrandDetailFields(row: Row): RecordField[] {
  return [
    { label: "Brand Name", value: row["name"], type: "text" },
    { label: "Active", value: row["isActive"], type: "boolean" },
    { label: "Created", value: row["createdAt"], type: "date" },
  ];
}

export function getBrandTimeline(row: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Brand created", timestamp: `${row["createdAt"]}T00:00:00`, actor: "System" },
  ];
}

export const brandRelated: RelatedRecord[] = [];

/* ------------------------------------------------------------------ *
 * Location (nested under a Brand)
 * ------------------------------------------------------------------ */

export const locationColumns: Column[] = [
  { key: "locationName", label: "Location Name", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "modulesEnabled", label: "Modules Enabled", type: "text" },
  { key: "mappedWarehouseId", label: "Mapped Warehouse", type: "text" },
  { key: "monthlyRevenue", label: "Monthly Revenue", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "openedDate", label: "Opened Date", type: "date" },
];

/** Partner-scoped — Mapped Warehouse pulls THIS partner's own real warehouses (see getWarehouseOptionsForPartner's doc comment), never a fixed demo list. */
export async function getLocationFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const warehouseOptions = await getWarehouseOptionsForPartner(partnerId);
  return [
    { key: "locationName", label: "Location Name", type: "text", required: true },
    { key: "city", label: "City", type: "text", required: true },
    { key: "modulesEnabled", label: "Modules Enabled", type: "textarea", required: false },
    { key: "mappedWarehouseId", label: "Mapped Warehouse", type: "select", required: false, options: warehouseOptions.map((o) => o.label) },
    { key: "monthlyRevenue", label: "Monthly Revenue (₹)", type: "currency", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: [...BRAND_STATUSES] },
    { key: "openedDate", label: "Opened Date", type: "date", required: false },
  ];
}

export function locationToRow(l: LocationRow): Row {
  return {
    id: l.id,
    brandId: l.brandId,
    locationName: l.locationName,
    city: l.city,
    modulesEnabled: l.modulesEnabled ?? "",
    mappedWarehouseId: l.mappedWarehouseId ?? "",
    monthlyRevenue: paiseToRupees(l.monthlyRevenue),
    status: l.status,
    openedDate: l.openedDate ? l.openedDate.toISOString().slice(0, 10) : "",
  };
}

export function getLocationDetailFields(row: Row): RecordField[] {
  return [
    { label: "Location Name", value: row["locationName"], type: "text" },
    { label: "City", value: row["city"], type: "text" },
    { label: "Modules Enabled", value: row["modulesEnabled"], type: "text" },
    { label: "Mapped Warehouse", value: row["mappedWarehouseId"], type: "text" },
    { label: "Monthly Revenue", value: row["monthlyRevenue"], type: "currency" },
    { label: "Status", value: row["status"], type: "select", chipVariant: STATUS_VARIANT[String(row["status"])] ?? "neutral" },
    { label: "Opened Date", value: row["openedDate"], type: "date" },
  ];
}

export function getLocationTimeline(row: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Location added to the brand", timestamp: `${row["openedDate"] || new Date().toISOString().slice(0, 10)}T00:00:00`, actor: "System" },
  ];
}

export const locationRelated: RelatedRecord[] = [];

export type { BrandRollup };

export type AccessScope = "brand-wide" | "single-location";
