import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { LineItem } from "./billing";

/**
 * The three party-facing sales documents the Billing module had no record
 * type for: Quotation, Delivery Challan and Proforma Invoice. Ported from
 * AN-CRM's shared SalesDocument model (models/SalesDocument.ts), which
 * covers five doc types off one shape — the other two, Credit Note and
 * Debit Note, already exist here as billing-credit-notes.ts, so only these
 * three are defined.
 *
 * All three share the Invoice shape (a party + line items + computed
 * totals via LineItemsEditor/computeTotals + a status) and differ only in
 * a couple of header fields, so they share one config map here and one
 * form component (SalesDocumentForm) rather than three near-identical
 * copies. Real persistence: BusinessRecord moduleSlug "billing-quotations"
 * / "billing-delivery-challans" / "billing-proforma-invoices".
 */

export type { LineItem };

export const SALES_DOC_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Cancelled"] as const;
export type SalesDocStatus = (typeof SALES_DOC_STATUSES)[number];

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Draft: "neutral",
  Sent: "teal",
  Accepted: "success",
  Rejected: "danger",
  Cancelled: "neutral",
};

/** AN-CRM's challan purposes — a delivery challan moves goods without billing them. */
export const CHALLAN_PURPOSES = [
  "Job Work",
  "Supply on Approval",
  "Sale on Approval",
  "Line Sales",
  "Exhibition / Fairs",
  "Others",
] as const;

export type SalesDocKind = "quotation" | "delivery-challan" | "proforma-invoice";

export interface SalesDocConfig {
  kind: SalesDocKind;
  /** BusinessRecord moduleSlug this doc type persists under. */
  slug: string;
  /** Route segment under /partner/[partnerId]/billing/. */
  segment: string;
  label: string;
  pluralLabel: string;
  /** registerPage id prefix, e.g. "billing.quotations". */
  pageIdPrefix: string;
  numberLabel: string;
  columns: Column[];
  detailFields: (record: Row) => RecordField[];
}

const commonHeadCols: Column[] = [
  { key: "contact", label: "Contact", type: "relation-link" },
  { key: "issueDate", label: "Issue Date", type: "date" },
];

const commonTotalCols: Column[] = [
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "totalAmount", label: "Total Amount", type: "currency" },
];

export const quotationColumns: Column[] = [
  { key: "id", label: "Quotation Number", type: "text" },
  ...commonHeadCols,
  { key: "validUntil", label: "Valid Until", type: "date" },
  ...commonTotalCols,
];

export const deliveryChallanColumns: Column[] = [
  { key: "id", label: "Challan Number", type: "text" },
  ...commonHeadCols,
  { key: "purpose", label: "Purpose", type: "select-chip" },
  { key: "vehicleNumber", label: "Vehicle Number", type: "text" },
  ...commonTotalCols,
];

export const proformaInvoiceColumns: Column[] = [
  { key: "id", label: "Proforma Number", type: "text" },
  ...commonHeadCols,
  { key: "validUntil", label: "Valid Until", type: "date" },
  ...commonTotalCols,
];

function totalsFields(r: Row): RecordField[] {
  return [
    { label: "Subtotal", value: r["subtotal"], type: "currency" },
    { label: "Tax Amount", value: r["taxAmount"], type: "currency" },
    { label: "Total Amount", value: r["totalAmount"], type: "currency" },
    { label: "Notes", value: r["notes"], type: "text" },
  ];
}

function statusField(r: Row): RecordField {
  return {
    label: "Status",
    value: r["status"],
    type: "select",
    chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral",
  };
}

export function getQuotationDetailFields(r: Row): RecordField[] {
  return [
    { label: "Quotation Number", value: r["id"], type: "text" },
    { label: "Contact", value: r["contact"], type: "relation" },
    { label: "Issue Date", value: r["issueDate"], type: "date" },
    { label: "Valid Until", value: r["validUntil"], type: "date" },
    statusField(r),
    ...totalsFields(r),
  ];
}

export function getDeliveryChallanDetailFields(r: Row): RecordField[] {
  return [
    { label: "Challan Number", value: r["id"], type: "text" },
    { label: "Contact", value: r["contact"], type: "relation" },
    { label: "Issue Date", value: r["issueDate"], type: "date" },
    { label: "Purpose", value: r["purpose"], type: "text" },
    { label: "Vehicle Number", value: r["vehicleNumber"], type: "text" },
    { label: "Dispatch Address", value: r["dispatchAddress"], type: "text" },
    statusField(r),
    ...totalsFields(r),
  ];
}

export function getProformaInvoiceDetailFields(r: Row): RecordField[] {
  return [
    { label: "Proforma Number", value: r["id"], type: "text" },
    { label: "Contact", value: r["contact"], type: "relation" },
    { label: "Issue Date", value: r["issueDate"], type: "date" },
    { label: "Valid Until", value: r["validUntil"], type: "date" },
    statusField(r),
    ...totalsFields(r),
  ];
}

export const SALES_DOC_CONFIG: Record<SalesDocKind, SalesDocConfig> = {
  quotation: {
    kind: "quotation",
    slug: "billing-quotations",
    segment: "quotations",
    label: "Quotation",
    pluralLabel: "Quotations",
    pageIdPrefix: "billing.quotations",
    numberLabel: "Quotation Number",
    columns: quotationColumns,
    detailFields: getQuotationDetailFields,
  },
  "delivery-challan": {
    kind: "delivery-challan",
    slug: "billing-delivery-challans",
    segment: "delivery-challans",
    label: "Delivery Challan",
    pluralLabel: "Delivery Challans",
    pageIdPrefix: "billing.delivery-challans",
    numberLabel: "Challan Number",
    columns: deliveryChallanColumns,
    detailFields: getDeliveryChallanDetailFields,
  },
  "proforma-invoice": {
    kind: "proforma-invoice",
    slug: "billing-proforma-invoices",
    segment: "proforma-invoices",
    label: "Proforma Invoice",
    pluralLabel: "Proforma Invoices",
    pageIdPrefix: "billing.proforma-invoices",
    numberLabel: "Proforma Number",
    columns: proformaInvoiceColumns,
    detailFields: getProformaInvoiceDetailFields,
  },
};

export function getSalesDocTimeline(label: string): TimelineEntry[] {
  return [{ id: "t1", label: `${label} created`, timestamp: new Date().toISOString(), actor: "System" }];
}

export const salesDocRelated: RelatedRecord[] = [];
