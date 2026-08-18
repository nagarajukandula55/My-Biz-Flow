import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { LineItem } from "./billing";

/**
 * Credit Notes / Debit Notes for the Billing module — same document shape
 * as an Invoice (contact + line items + computed totals via
 * LineItemsEditor/computeTotals) but adjusts a contact's balance instead
 * of billing them, optionally referencing the original invoice. Real
 * persistence: BusinessRecord moduleSlug "billing-credit-notes".
 */

export type { LineItem };

const NOTE_TYPE_VARIANT: Record<string, StatusVariant> = {
  "Credit Note": "success",
  "Debit Note": "amber",
};

export const NOTE_TYPES = ["Credit Note", "Debit Note"] as const;
export const NOTE_REASONS = ["Sales Return", "Post-Sale Discount", "Billing Error", "Rate Difference", "Other"] as const;

export const creditNoteColumns: Column[] = [
  { key: "id", label: "Note Number", type: "text" },
  { key: "noteType", label: "Type", type: "select-chip", chipVariantMap: NOTE_TYPE_VARIANT },
  { key: "contact", label: "Contact", type: "relation-link" },
  { key: "linkedInvoiceId", label: "Against Invoice", type: "relation-link" },
  { key: "reason", label: "Reason", type: "text" },
  { key: "issueDate", label: "Issue Date", type: "date" },
  { key: "totalAmount", label: "Total Amount", type: "currency" },
];

export function getCreditNoteDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Note Number", value: r["id"], type: "text" },
    { label: "Type", value: r["noteType"], type: "select", chipVariant: NOTE_TYPE_VARIANT[String(r["noteType"])] ?? "neutral" },
    { label: "Contact", value: r["contact"], type: "relation" },
    { label: "Against Invoice", value: r["linkedInvoiceId"], type: "relation" },
    { label: "Reason", value: r["reason"], type: "text" },
    { label: "Issue Date", value: r["issueDate"], type: "date" },
    { label: "Subtotal", value: r["subtotal"], type: "currency" },
    { label: "Tax Amount", value: r["taxAmount"], type: "currency" },
    { label: "Total Amount", value: r["totalAmount"], type: "currency" },
  ];
}

export function getCreditNoteTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Note issued against contact balance", timestamp: new Date().toISOString(), actor: "System" },
  ];
}

export const creditNoteRelated: RelatedRecord[] = [];
