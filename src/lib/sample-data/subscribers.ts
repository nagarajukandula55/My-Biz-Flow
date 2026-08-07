import type { Column, Row } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";

// Sample vendor/subscription data backing the Super-Admin /admin/subscribers
// list and the vendor-facing /vendor/[vendorId]/billing view. No DB yet —
// static sample rows, demo-labeled actions only.

const STATUS_VARIANT: Record<string, StatusVariant> = {
  active: "success",
  trial: "teal",
  "past-due": "danger",
};

export const subscriberColumns: Column[] = [
  { key: "vendorName", label: "Vendor", type: "text" },
  { key: "plan", label: "Plan", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "startDate", label: "Start Date", type: "date" },
  { key: "seats", label: "Seats", type: "text" },
];

export const subscriberRows: Row[] = [
  { id: "demo", vendorName: "Demo Retail Co.", plan: "pro", status: "active", startDate: "2026-03-01", seats: 8 },
  { id: "acme", vendorName: "Acme Auto Service", plan: "basic", status: "trial", startDate: "2026-07-20", seats: 2 },
  { id: "citycare", vendorName: "CityCare Clinic", plan: "ultimate", status: "active", startDate: "2025-11-05", seats: 22 },
  { id: "westside", vendorName: "Westside Wholesale", plan: "pro", status: "past-due", startDate: "2026-01-14", seats: 11 },
];

export function getSubscriber(vendorId: string): Row {
  return subscriberRows.find((r) => String(r["id"]) === vendorId) ?? subscriberRows[0];
}
