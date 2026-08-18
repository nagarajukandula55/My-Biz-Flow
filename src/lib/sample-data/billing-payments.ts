import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Payments recorded against a Billing invoice — a separate BusinessRecord
 * (moduleSlug "billing-payments") rather than a field on the invoice, so
 * an invoice can carry multiple (partial) payments. An invoice's
 * paid/balance is *computed* by summing its linked payments — see
 * getInvoiceBalance() below, used by the invoice detail page.
 */

const PAYMENT_MODE_VARIANT: Record<string, StatusVariant> = {
  "Bank Transfer": "teal",
  UPI: "success",
  Cheque: "amber",
  Cash: "neutral",
  Card: "warning",
};

export const PAYMENT_MODES = ["Bank Transfer", "UPI", "Cheque", "Cash", "Card"] as const;

export const billingPaymentColumns: Column[] = [
  { key: "id", label: "Payment ID", type: "text" },
  { key: "invoiceId", label: "Invoice", type: "relation-link" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "amount", label: "Amount", type: "currency" },
  { key: "mode", label: "Mode", type: "select-chip", chipVariantMap: PAYMENT_MODE_VARIANT },
  { key: "date", label: "Date", type: "date" },
  { key: "reference", label: "Reference", type: "text" },
];

/** Built dynamically per-request since the select options (which invoices/contacts exist) are real DB rows, not static data. */
export function buildBillingPaymentFormFields(invoiceOptions: string[], contactOptions: string[]): FormFieldDef[] {
  return [
    { key: "id", label: "Payment ID", type: "text", required: false },
    { key: "invoiceId", label: "Invoice", type: "select", required: true, options: invoiceOptions },
    { key: "contact", label: "Contact", type: "select", required: false, options: contactOptions },
    { key: "amount", label: "Amount", type: "currency", required: true },
    { key: "mode", label: "Mode", type: "select", required: true, options: [...PAYMENT_MODES] },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "reference", label: "Reference / Transaction ID", type: "text", required: false },
  ];
}

export function getBillingPaymentDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Payment ID", value: r["id"], type: "text" },
    { label: "Invoice", value: r["invoiceId"], type: "relation" },
    { label: "Contact", value: r["contact"], type: "text" },
    { label: "Amount", value: r["amount"], type: "currency" },
    { label: "Mode", value: r["mode"], type: "select", chipVariant: PAYMENT_MODE_VARIANT[String(r["mode"])] ?? "neutral" },
    { label: "Date", value: r["date"], type: "date" },
    { label: "Reference", value: r["reference"], type: "text" },
  ];
}

export function getBillingPaymentTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Payment recorded against invoice", timestamp: new Date().toISOString(), actor: "System" },
  ];
}

export const billingPaymentRelated: RelatedRecord[] = [];

/** Sum of payments linked to one invoice id, and the resulting balance vs. its total. */
export function getInvoiceBalance(payments: Row[], invoiceId: string, totalAmount: number) {
  const linked = payments.filter((p) => String(p["invoiceId"]) === invoiceId);
  const paid = linked.reduce((sum, p) => sum + (Number(p["amount"]) || 0), 0);
  return { paid, balance: totalAmount - paid, payments: linked };
}
