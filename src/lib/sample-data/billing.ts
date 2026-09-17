import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Invoice sample data for the billing module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Draft": "neutral",
  "Sent": "teal",
  "Paid": "success",
  "Overdue": "danger",
  "Partially Paid": "warning"
};

export type LineItem = {
  description: string;
  quantity: number;
  unit: string;
  /** ALWAYS the tax-EXCLUSIVE per-unit rate, regardless of `priceMode` —
   * every downstream reader (totals, printed documents) can keep doing
   * qty * unitPrice * (1 + taxRate/100) unmodified. `priceMode` only
   * changes how the Line Items editor's price input is typed into and
   * displayed — see LineItemsEditor.tsx's displayedUnitPrice(). */
  unitPrice: number;
  taxRate: number; // percent
  /** Whether this line's price was entered tax-exclusive (default, add
   * GST on top) or tax-inclusive (GST backed out of the typed amount) —
   * a display/input-interpretation hint only, not a second source of
   * truth: `unitPrice` above is already normalized to exclusive either
   * way. Absent on any line item saved before this existed -> "excl". */
  priceMode?: "excl" | "incl";
  /** Optional link back to the catalog record (now Inventory's own
   * inventory-bom Material Catalog — see lib/lineItemCatalog.ts, not the
   * separate billing-items list) used to autofill this line. */
  itemId?: string;
  /** HSN/SAC code for this line — printed on the tax invoice and used for the HSN summary table. */
  hsnCode?: string;
};

/** invoice id -> its line items — kept separate from billingRows so the
 * dense DataTable/detail-field views stay flat while the invoice
 * creation form and printable document can pull the itemized breakdown. */
export const billingLineItems: Record<string, LineItem[]> = {
  "INV-3301": [
    { description: "Consulting services", quantity: 12, unit: "hrs", unitPrice: 3000, taxRate: 18 },
    { description: "Software license — 1 yr", quantity: 1, unit: "license", unitPrice: 12000, taxRate: 18 },
  ],
  "INV-3300": [
    { description: "Design consultation package", quantity: 1, unit: "package", unitPrice: 22000, taxRate: 18 },
  ],
  "INV-3299": [
    { description: "Fleet maintenance retainer — Aug", quantity: 1, unit: "month", unitPrice: 15000, taxRate: 18 },
  ],
  "INV-3298": [
    { description: "POS hardware install", quantity: 1, unit: "job", unitPrice: 6000, taxRate: 18 },
    { description: "Staff setup & training", quantity: 3, unit: "hrs", unitPrice: 1000, taxRate: 18 },
  ],
};

/**
 * Where an invoice originated from — stamped once at record-creation time
 * by each of the three places a "billing" BusinessRecord gets created
 * (createInvoiceFromWorkorderAction for Service Centre, the POS checkout
 * action, and createBusinessRecordAction's generic path for a directly
 * created/manual Billing invoice — see businessRecordActions.ts). Kept as
 * a real, filterable field rather than derived after the fact from the
 * presence of sourceWorkorderId/sourcePosSaleId, so the Invoices list can
 * filter on it directly via listBusinessRecordsPaginated's exact-match
 * JSON filters. Invoices created before this field existed simply have no
 * value here and won't match a Source filter — same as any other field
 * added after data already existed.
 */
export const INVOICE_SOURCE_OPTIONS = ["Service Centre", "POS Sale", "Direct"] as const;

const INVOICE_SOURCE_VARIANT: Record<string, StatusVariant> = {
  "Service Centre": "teal",
  "POS Sale": "success",
  "Direct": "neutral",
};

export const billingColumns: Column[] = [
  { key: "id", label: "Invoice Number", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "invoiceSource", label: "Source", type: "select-chip", chipVariantMap: INVOICE_SOURCE_VARIANT },
  { key: "issueDate", label: "Issue Date", type: "date" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "lineItemsSummary", label: "Line Items", type: "text" },
  { key: "subtotal", label: "Subtotal", type: "currency" },
  { key: "taxAmount", label: "Tax Amount", type: "currency" },
  { key: "discountAmount", label: "Discount", type: "currency" },
  { key: "roundOff", label: "Round Off", type: "currency" },
  { key: "totalAmount", label: "Total Amount", type: "currency" },
  { key: "amountPaid", label: "Amount Paid", type: "currency" },
  { key: "amountDue", label: "Amount Due", type: "currency" },
  { key: "paymentStatus", label: "Payment Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "paymentMode", label: "Payment Mode", type: "select-chip" },
];

/** Payment modes accepted for a Service Centre / Billing invoice payment. */
export const PAYMENT_MODE_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Credit"] as const;

export const billingRows: Row[] = [
  {
    id: "INV-3301",
    customer: "Bluepeak Traders",
    issueDate: "2026-07-28",
    dueDate: "2026-08-11",
    lineItemsSummary: "Consulting services — 12 hrs; Software license — 1 yr",
    subtotal: 48000,
    taxAmount: 8640,
    totalAmount: 56640,
    discountAmount: 0,
    roundOff: 0,
    amountPaid: 0,
    amountDue: 56640,
    paymentStatus: "Sent",
    paymentMode: "Bank Transfer",
  },
  {
    id: "INV-3300",
    customer: "Orchid Interiors",
    issueDate: "2026-07-15",
    dueDate: "2026-07-29",
    lineItemsSummary: "Design consultation package",
    subtotal: 22000,
    taxAmount: 3960,
    totalAmount: 25960,
    paymentStatus: "Overdue",
    paymentMode: "Cheque",
  },
  {
    id: "INV-3299",
    customer: "Nimbus Logistics",
    issueDate: "2026-08-01",
    dueDate: "2026-08-15",
    lineItemsSummary: "Fleet maintenance retainer — Aug",
    subtotal: 15000,
    taxAmount: 2700,
    totalAmount: 17700,
    paymentStatus: "Paid",
    paymentMode: "UPI",
  },
  {
    id: "INV-3298",
    customer: "Sunrise Bakery",
    issueDate: "2026-08-03",
    dueDate: "2026-08-17",
    lineItemsSummary: "POS hardware install + setup",
    subtotal: 9000,
    taxAmount: 1620,
    totalAmount: 10620,
    discountAmount: 200,
    roundOff: 0,
    amountPaid: 5000,
    amountDue: 5420,
    paymentStatus: "Partially Paid",
    paymentMode: "Cash",
  },
];

export const billingFormFields: FormFieldDef[] = [
  { key: "id", label: "Invoice Number", type: "text", required: true },
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "issueDate", label: "Issue Date", type: "date", required: true },
  { key: "dueDate", label: "Due Date", type: "date", required: true },
  { key: "lineItemsSummary", label: "Line Items", type: "textarea", required: false },
  { key: "subtotal", label: "Subtotal", type: "currency", required: false },
  { key: "taxAmount", label: "Tax Amount", type: "currency", required: false },
  { key: "discountAmount", label: "Discount", type: "currency", required: false },
  { key: "roundOff", label: "Round Off", type: "number", required: false, placeholder: "e.g. -0.40 or 0.60" },
  { key: "totalAmount", label: "Total Amount", type: "currency", required: true },
  { key: "amountPaid", label: "Amount Paid", type: "currency", required: false },
  { key: "amountDue", label: "Amount Due", type: "currency", required: false, placeholder: "Auto = Total − Amount Paid; kept editable for manual adjustments" },
  { key: "paymentStatus", label: "Payment Status", type: "select", required: true, options: ["Draft","Sent","Paid","Overdue","Partially Paid"] },
  { key: "paymentMode", label: "Payment Mode", type: "select", required: false, options: [...PAYMENT_MODE_OPTIONS] },
  { key: "invoiceSource", label: "Source", type: "select", required: false, options: [...INVOICE_SOURCE_OPTIONS] },
];

export function getBillingRecord(recordId: string): Row {
  return billingRows.find((r) => String(r["id"]) === recordId) ?? billingRows[0];
}

export function getBillingDetailFields(record: Row): RecordField[] {
  const r = record;
  const hasCustomerBlock = Boolean(
    r["customerCompany"] || r["customerPhone"] || r["customerEmail"] || r["customerAddress"] ||
    r["customerCity"] || r["customerState"] || r["customerPincode"] || r["customerGstin"]
  );
  const supplyType = r["supplyType"] ? String(r["supplyType"]) : undefined;
  return [
    { label: "Invoice Number", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    ...(hasCustomerBlock
      ? [
          { label: "Customer Company", value: r["customerCompany"], type: "text" as const },
          { label: "Customer GSTIN", value: r["customerGstin"], type: "text" as const },
          { label: "Customer Phone", value: r["customerPhone"], type: "phone" as const },
          { label: "Customer Email", value: r["customerEmail"], type: "text" as const },
          { label: "Billing Address", value: r["customerAddress"], type: "text" as const },
          { label: "City", value: r["customerCity"], type: "text" as const },
          { label: "State", value: r["customerState"], type: "text" as const },
          { label: "Pincode", value: r["customerPincode"], type: "text" as const },
        ]
      : []),
    { label: "Issue Date", value: r["issueDate"], type: "date" },
    { label: "Due Date", value: r["dueDate"], type: "date" },
    { label: "Line Items", value: r["lineItemsSummary"], type: "text" },
    { label: "Subtotal", value: r["subtotal"], type: "currency" },
    { label: "Discount", value: r["discountAmount"], type: "currency" },
    ...(supplyType === "INTERSTATE"
      ? [{ label: "IGST", value: r["igstAmount"], type: "currency" as const }]
      : supplyType === "INTRASTATE"
        ? [
            { label: "CGST", value: r["cgstAmount"], type: "currency" as const },
            { label: "SGST", value: r["sgstAmount"], type: "currency" as const },
          ]
        : [{ label: "Tax Amount", value: r["taxAmount"], type: "currency" as const }]),
    { label: "Round Off", value: r["roundOff"], type: "currency" },
    { label: "Total Amount", value: r["totalAmount"], type: "currency" },
    { label: "Amount Paid", value: r["amountPaid"], type: "currency" },
    { label: "Amount Due", value: r["amountDue"], type: "currency" },
    { label: "Payment Status", value: r["paymentStatus"], type: "select", chipVariant: STATUS_VARIANT[String(r["paymentStatus"])] ?? "neutral" },
    { label: "Payment Mode", value: r["paymentMode"], type: "select", chipVariant: STATUS_VARIANT[String(r["paymentMode"])] ?? "neutral" },
    ...(r["invoiceSource"] ? [{ label: "Source", value: r["invoiceSource"], type: "select" as const }] : []),
    ...(r["notes"] ? [{ label: "Notes", value: r["notes"], type: "text" as const }] : []),
    ...(r["terms"] ? [{ label: "Terms & Conditions", value: r["terms"], type: "text" as const }] : []),
  ];
}

export function getBillingTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Invoice generated from billing run by Anita Rao — IP 103.21.44.22", timestamp: "2026-07-30T09:20:00", actor: "Anita Rao" },
    { id: "t2", label: "Invoice sent to customer by email", timestamp: "2026-07-30T09:22:00", actor: "System" },
    { id: "t3", label: "Payment recorded against invoice by Suresh M. — IP 103.21.44.18", timestamp: "2026-08-04T16:05:00", actor: "Suresh M." },
    { id: "t4", label: "Payment status reconciled with bank statement", timestamp: "2026-08-06T10:00:00", actor: "Accounts Team" },
  ];
}

export const billingRelated: RelatedRecord[] = [];
