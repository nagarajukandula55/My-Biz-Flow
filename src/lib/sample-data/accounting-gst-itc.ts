import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Input Tax Credit (ITC) register — purchase-side entries (vendor bills)
 * that feed GSTR-3B's "ITC Claimed" figure, tracked separately from
 * outward-supply (sales) records in accounting-gst.ts. Real persistence:
 * BusinessRecord moduleSlug "accounting-gst-itc".
 */

const ELIGIBILITY_VARIANT: Record<string, StatusVariant> = {
  Eligible: "success",
  Ineligible: "danger",
  "Under Review": "warning",
};

export const ITC_ELIGIBILITY = ["Eligible", "Ineligible", "Under Review"] as const;

export const gstItcColumns: Column[] = [
  { key: "id", label: "Entry ID", type: "text" },
  { key: "supplierName", label: "Supplier", type: "text" },
  { key: "supplierGstin", label: "Supplier GSTIN", type: "text" },
  { key: "billDate", label: "Bill Date", type: "date" },
  { key: "billRef", label: "Bill Reference", type: "text" },
  { key: "taxableValue", label: "Taxable Value", type: "currency" },
  { key: "taxAmount", label: "Tax (ITC) Amount", type: "currency" },
  { key: "eligibility", label: "Eligibility", type: "select-chip", chipVariantMap: ELIGIBILITY_VARIANT },
];

export const gstItcFormFields: FormFieldDef[] = [
  { key: "id", label: "Entry ID", type: "text", required: false },
  { key: "supplierName", label: "Supplier", type: "text", required: true },
  { key: "supplierGstin", label: "Supplier GSTIN", type: "text", required: false },
  { key: "billDate", label: "Bill Date", type: "date", required: true },
  { key: "billRef", label: "Bill Reference", type: "text", required: false },
  { key: "taxableValue", label: "Taxable Value", type: "currency", required: true },
  { key: "taxAmount", label: "Tax (ITC) Amount", type: "currency", required: true },
  { key: "eligibility", label: "Eligibility", type: "select", required: true, options: [...ITC_ELIGIBILITY] },
];

export function getGstItcDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Entry ID", value: r["id"], type: "text" },
    { label: "Supplier", value: r["supplierName"], type: "text" },
    { label: "Supplier GSTIN", value: r["supplierGstin"], type: "text" },
    { label: "Bill Date", value: r["billDate"], type: "date" },
    { label: "Bill Reference", value: r["billRef"], type: "text" },
    { label: "Taxable Value", value: r["taxableValue"], type: "currency" },
    { label: "Tax (ITC) Amount", value: r["taxAmount"], type: "currency" },
    { label: "Eligibility", value: r["eligibility"], type: "select", chipVariant: ELIGIBILITY_VARIANT[String(r["eligibility"])] ?? "neutral" },
  ];
}

export function getGstItcTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "ITC entry recorded from vendor bill", timestamp: new Date().toISOString(), actor: "System" },
  ];
}

export const gstItcRelated: RelatedRecord[] = [];

/** Sum of Eligible ITC entries whose billDate falls in the given period ("YYYY-MM"). */
export function computeEligibleItcForPeriod(entries: Row[], periodKey: string): number {
  return entries
    .filter((e) => e["eligibility"] === "Eligible" && String(e["billDate"] ?? "").slice(0, 7) === periodKey)
    .reduce((sum, e) => sum + (Number(e["taxAmount"]) || 0), 0);
}
