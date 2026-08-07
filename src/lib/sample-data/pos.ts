import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Sale sample data for the pos module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Cash": "success",
  "UPI": "teal",
  "Card": "amber",
  "Wallet": "neutral"
};

export const posColumns: Column[] = [
  { key: "id", label: "Receipt Number", type: "text" },
  { key: "sku", label: "SKU", type: "text" },
  { key: "productName", label: "Product Name", type: "text" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "price", label: "Unit Price", type: "currency" },
  { key: "taxRate", label: "Tax Rate (%)", type: "text" },
  { key: "stockOnHand", label: "Stock on Hand", type: "text" },
  { key: "discountApplied", label: "Discount Applied", type: "currency" },
  { key: "paymentMethod", label: "Payment Method", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "cashier", label: "Cashier", type: "text" },
  { key: "transactionTimestamp", label: "Transaction Time", type: "date" },
  { key: "ipAddress", label: "IP Address (audit)", type: "text" },
];

export const posRows: Row[] = [
  {
    id: "RCPT-10231",
    sku: "GRC-0091",
    productName: "Basmati Rice 5kg",
    category: "Groceries",
    price: 640,
    taxRate: 5,
    stockOnHand: 84,
    discountApplied: 20,
    paymentMethod: "UPI",
    cashier: "Meena R.",
    transactionTimestamp: "2026-08-07T10:12:00",
    ipAddress: "103.21.44.10",
  },
  {
    id: "RCPT-10230",
    sku: "BEV-0044",
    productName: "Cold Coffee 250ml",
    category: "Beverages",
    price: 60,
    taxRate: 12,
    stockOnHand: 210,
    discountApplied: 0,
    paymentMethod: "Cash",
    cashier: "Arjun D.",
    transactionTimestamp: "2026-08-07T09:58:00",
    ipAddress: "103.21.44.10",
  },
  {
    id: "RCPT-10229",
    sku: "ELE-0512",
    productName: "USB-C Cable 1m",
    category: "Electronics",
    price: 249,
    taxRate: 18,
    stockOnHand: 36,
    discountApplied: 0,
    paymentMethod: "Card",
    cashier: "Meena R.",
    transactionTimestamp: "2026-08-06T18:44:00",
    ipAddress: "103.21.44.12",
  },
  {
    id: "RCPT-10228",
    sku: "APP-0221",
    productName: "Cotton T-Shirt M",
    category: "Apparel",
    price: 499,
    taxRate: 12,
    stockOnHand: 58,
    discountApplied: 50,
    paymentMethod: "Wallet",
    cashier: "Ravi K.",
    transactionTimestamp: "2026-08-06T17:20:00",
    ipAddress: "103.21.44.15",
  },
];

export const posFormFields: FormFieldDef[] = [
  { key: "id", label: "Receipt Number", type: "text", required: true },
  { key: "sku", label: "SKU", type: "text", required: true },
  { key: "productName", label: "Product Name", type: "text", required: true },
  { key: "category", label: "Category", type: "select", required: true, options: ["Groceries","Beverages","Electronics","Apparel","Household"] },
  { key: "price", label: "Unit Price", type: "currency", required: true },
  { key: "taxRate", label: "Tax Rate (%)", type: "number", required: false },
  { key: "stockOnHand", label: "Stock on Hand", type: "number", required: false },
  { key: "discountApplied", label: "Discount Applied", type: "currency", required: false },
  { key: "paymentMethod", label: "Payment Method", type: "select", required: true, options: ["Cash","UPI","Card","Wallet"] },
  { key: "cashier", label: "Cashier", type: "text", required: true },
  { key: "transactionTimestamp", label: "Transaction Time", type: "date", required: true },
  { key: "ipAddress", label: "IP Address (audit)", type: "text", required: false },
];

export function getPosRecord(recordId: string): Row {
  return posRows.find((r) => String(r["id"]) === recordId) ?? posRows[0];
}

export function getPosDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Receipt Number", value: r["id"], type: "text" },
    { label: "SKU", value: r["sku"], type: "text" },
    { label: "Product Name", value: r["productName"], type: "text" },
    { label: "Category", value: r["category"], type: "select", chipVariant: STATUS_VARIANT[String(r["category"])] ?? "neutral" },
    { label: "Unit Price", value: r["price"], type: "currency" },
    { label: "Tax Rate (%)", value: r["taxRate"], type: "text" },
    { label: "Stock on Hand", value: r["stockOnHand"], type: "text" },
    { label: "Discount Applied", value: r["discountApplied"], type: "currency" },
    { label: "Payment Method", value: r["paymentMethod"], type: "select", chipVariant: STATUS_VARIANT[String(r["paymentMethod"])] ?? "neutral" },
    { label: "Cashier", value: r["cashier"], type: "text" },
    { label: "Transaction Time", value: r["transactionTimestamp"], type: "date" },
    { label: "IP Address (audit)", value: r["ipAddress"], type: "text" },
  ];
}

export function getPosTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Sale rung up at register by Meena R. — IP 103.21.44.10", timestamp: "2026-08-07T10:12:00", actor: "Meena R." },
    { id: "t2", label: "Discount applied by cashier — IP 103.21.44.10", timestamp: "2026-08-07T10:12:10", actor: "Meena R." },
    { id: "t3", label: "Payment captured via UPI, receipt generated — IP 103.21.44.10", timestamp: "2026-08-07T10:12:30", actor: "Meena R." },
    { id: "t4", label: "Stock on hand decremented for sold SKU", timestamp: "2026-08-07T10:12:35", actor: "System" },
  ];
}

export const posRelated: RelatedRecord[] = [];
