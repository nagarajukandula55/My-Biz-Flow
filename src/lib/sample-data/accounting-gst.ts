import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// GST Return sample data for the accounting-gst module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Pending": "warning",
  "Filed": "success",
  "Late Filed": "danger",
  "Under Review": "teal"
};

export const accountingGstColumns: Column[] = [
  { key: "id", label: "Return Reference", type: "text" },
  { key: "gstin", label: "GSTIN", type: "text" },
  { key: "period", label: "Filing Period", type: "text" },
  { key: "returnType", label: "Return Type", type: "select-chip" },
  { key: "taxableValue", label: "Taxable Value", type: "currency" },
  { key: "taxLiability", label: "Tax Liability", type: "currency" },
  { key: "itcClaimed", label: "ITC Claimed", type: "currency" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "filingStatus", label: "Filing Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const accountingGstRows: Row[] = [
  {
    id: "GST-2607-01",
    gstin: "29AACCM1234F1Z5",
    period: "Jul 2026",
    returnType: "GSTR-3B",
    taxableValue: 2450000,
    taxLiability: 441000,
    itcClaimed: 168000,
    dueDate: "2026-08-20",
    filingStatus: "Pending",
  },
  {
    id: "GST-2606-01",
    gstin: "29AACCM1234F1Z5",
    period: "Jun 2026",
    returnType: "GSTR-3B",
    taxableValue: 2180000,
    taxLiability: 392400,
    itcClaimed: 151000,
    dueDate: "2026-07-20",
    filingStatus: "Filed",
  },
  {
    id: "GST-2606-02",
    gstin: "29AACCM1234F1Z5",
    period: "Jun 2026",
    returnType: "GSTR-1",
    taxableValue: 2180000,
    taxLiability: 0,
    itcClaimed: 0,
    dueDate: "2026-07-11",
    filingStatus: "Filed",
  },
  {
    id: "GST-2605-01",
    gstin: "29AACCM1234F1Z5",
    period: "May 2026",
    returnType: "GSTR-3B",
    taxableValue: 1950000,
    taxLiability: 351000,
    itcClaimed: 140000,
    dueDate: "2026-06-20",
    filingStatus: "Late Filed",
  },
];

export const accountingGstFormFields: FormFieldDef[] = [
  { key: "id", label: "Return Reference", type: "text", required: true },
  { key: "gstin", label: "GSTIN", type: "text", required: true },
  { key: "period", label: "Filing Period", type: "text", required: true },
  { key: "returnType", label: "Return Type", type: "select", required: true, options: ["GSTR-1","GSTR-3B","GSTR-9"] },
  { key: "taxableValue", label: "Taxable Value", type: "currency", required: false },
  { key: "taxLiability", label: "Tax Liability", type: "currency", required: true },
  { key: "itcClaimed", label: "ITC Claimed", type: "currency", required: false },
  { key: "dueDate", label: "Due Date", type: "date", required: true },
  { key: "filingStatus", label: "Filing Status", type: "select", required: true, options: ["Pending","Filed","Late Filed","Under Review"] },
];

export function getAccountingGstRecord(recordId: string): Row {
  return accountingGstRows.find((r) => String(r["id"]) === recordId) ?? accountingGstRows[0];
}

export function getAccountingGstDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Return Reference", value: r["id"], type: "text" },
    { label: "GSTIN", value: r["gstin"], type: "text" },
    { label: "Filing Period", value: r["period"], type: "text" },
    { label: "Return Type", value: r["returnType"], type: "select", chipVariant: STATUS_VARIANT[String(r["returnType"])] ?? "neutral" },
    { label: "Taxable Value", value: r["taxableValue"], type: "currency" },
    { label: "Tax Liability", value: r["taxLiability"], type: "currency" },
    { label: "ITC Claimed", value: r["itcClaimed"], type: "currency" },
    { label: "Due Date", value: r["dueDate"], type: "date" },
    { label: "Filing Status", value: r["filingStatus"], type: "select", chipVariant: STATUS_VARIANT[String(r["filingStatus"])] ?? "neutral" },
  ];
}

export function getAccountingGstTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "GST return draft created from ledger sync by Priya Sharma — IP 103.21.44.12", timestamp: "2026-07-28T11:02:00", actor: "Priya Sharma" },
    { id: "t2", label: "Taxable value and ITC figures recalculated after reconciliation by Suresh M. — IP 103.21.44.18", timestamp: "2026-08-02T15:40:00", actor: "Suresh M." },
    { id: "t3", label: "Return submitted to GSTN portal by Priya Sharma — IP 103.21.44.12", timestamp: "2026-08-05T18:10:00", actor: "Priya Sharma" },
    { id: "t4", label: "Filing status updated to reflect acknowledgement", timestamp: "2026-08-07T09:00:00", actor: "System" },
  ];
}

export const accountingGstRelated: RelatedRecord[] = [];
