import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import type { StatusVariant } from "@/components/StatusChip";

/**
 * Business expenses for the Billing module — ported from AN-CRM's vendor
 * Expenses page (app/vendor/expenses). A flat cash-out record (date +
 * category + amount + payment mode), deliberately NOT a double-entry
 * journal: it exists so the Profit & Loss report has a real expense side
 * to subtract from invoiced revenue. Real persistence: BusinessRecord
 * moduleSlug "billing-expenses".
 */

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries & Wages",
  "Utilities",
  "Purchases / Materials",
  "Transport & Fuel",
  "Repairs & Maintenance",
  "Marketing",
  "Professional Fees",
  "Bank Charges",
  "Taxes & Licences",
  "Other",
];

export const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];

const MODE_VARIANT: Record<string, StatusVariant> = {
  Cash: "amber",
  UPI: "teal",
  "Bank Transfer": "teal",
  Card: "neutral",
  Cheque: "neutral",
  Other: "neutral",
};

export const expenseColumns: Column[] = [
  { key: "id", label: "Expense ID", type: "text" },
  { key: "expenseDate", label: "Date", type: "date" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "description", label: "Description", type: "text" },
  { key: "vendorName", label: "Paid To", type: "text" },
  { key: "paymentMode", label: "Payment Mode", type: "select-chip", chipVariantMap: MODE_VARIANT },
  { key: "amount", label: "Amount", type: "currency" },
];

export const expenseFormFields: FormFieldDef[] = [
  { key: "id", label: "Expense ID", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "expenseDate", label: "Date", type: "date", required: true },
  { key: "category", label: "Category", type: "select", required: true, options: EXPENSE_CATEGORIES },
  { key: "description", label: "Description", type: "text", required: false },
  { key: "vendorName", label: "Paid To", type: "text", required: false },
  { key: "paymentMode", label: "Payment Mode", type: "select", required: true, options: PAYMENT_MODES },
  { key: "amount", label: "Amount", type: "currency", required: true },
  { key: "referenceNumber", label: "Bill / Reference Number", type: "text", required: false },
  { key: "taxAmount", label: "GST / Tax Included", type: "currency", required: false },
];

export function getExpenseDetailFields(record: Row): RecordField[] {
  return [
    { label: "Expense ID", value: record["id"], type: "text" },
    { label: "Date", value: record["expenseDate"], type: "date" },
    { label: "Category", value: record["category"], type: "text" },
    { label: "Description", value: record["description"], type: "text" },
    { label: "Paid To", value: record["vendorName"], type: "text" },
    {
      label: "Payment Mode",
      value: record["paymentMode"],
      type: "select",
      chipVariant: MODE_VARIANT[String(record["paymentMode"])] ?? "neutral",
    },
    { label: "Bill / Reference Number", value: record["referenceNumber"], type: "text" },
    { label: "GST / Tax Included", value: record["taxAmount"], type: "currency" },
    { label: "Amount", value: record["amount"], type: "currency" },
  ];
}

export function getExpenseTimeline(record: Row): TimelineEntry[] {
  return [
    {
      id: "t1",
      label: `Expense recorded under "${String(record["category"] ?? "Other")}"`,
      timestamp: String(record["expenseDate"] ?? new Date().toISOString()),
      actor: "Partner Admin",
    },
  ];
}

export const expenseRelated: RelatedRecord[] = [];

/** Total of the given expense records, optionally restricted to a date range. */
export function sumExpenses(rows: Row[], from?: string, to?: string): number {
  return rows.reduce((sum, r) => {
    const date = String(r["expenseDate"] ?? "");
    if (from && date && date < from) return sum;
    if (to && date && date > to) return sum;
    return sum + Number(r["amount"] ?? 0);
  }, 0);
}

/** Expense totals grouped by category, sorted highest-first. */
export function expensesByCategory(rows: Row[], from?: string, to?: string): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const date = String(r["expenseDate"] ?? "");
    if (from && date && date < from) continue;
    if (to && date && date > to) continue;
    const cat = String(r["category"] ?? "Other");
    map.set(cat, (map.get(cat) ?? 0) + Number(r["amount"] ?? 0));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
