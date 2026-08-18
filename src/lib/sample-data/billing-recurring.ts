import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { LineItem } from "./billing";

/**
 * Recurring Invoice templates for the Billing module — a snapshot of
 * customer/line-items plus a frequency and nextRunDate. The cron route
 * (src/app/api/cron/billing-recurring-invoices/route.ts) creates a real
 * Billing invoice BusinessRecord from any template whose nextRunDate has
 * passed, then advances nextRunDate. Real persistence: BusinessRecord
 * moduleSlug "billing-recurring".
 */

export type { LineItem };

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Paused: "neutral",
};

export const RECURRING_FREQUENCIES = ["Weekly", "Monthly", "Quarterly", "Yearly"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const recurringInvoiceColumns: Column[] = [
  { key: "id", label: "Template ID", type: "text" },
  { key: "customer", label: "Customer", type: "text" },
  { key: "frequency", label: "Frequency", type: "text" },
  { key: "nextRunDate", label: "Next Run", type: "date" },
  { key: "totalAmount", label: "Amount", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export function getRecurringInvoiceDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Template ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "text" },
    { label: "Frequency", value: r["frequency"], type: "text" },
    { label: "Start Date", value: r["startDate"], type: "date" },
    { label: "Next Run Date", value: r["nextRunDate"], type: "date" },
    { label: "Amount", value: r["totalAmount"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getRecurringInvoiceTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Recurring invoice template created", timestamp: new Date().toISOString(), actor: "System" },
  ];
}

export const recurringInvoiceRelated: RelatedRecord[] = [];

export function advanceNextRunDate(current: string, frequency: RecurringFrequency): string {
  const d = new Date(current);
  switch (frequency) {
    case "Weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "Monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "Quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "Yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}
