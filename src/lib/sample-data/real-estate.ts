import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import { paiseToRupees, type EnquiryRow, type LeadStage } from "@/lib/realEstateData";

export { LEAD_STAGES, type LeadStage } from "@/lib/realEstateData";

// Field vocabulary for the Real Estate module's main page — now Enquiry
// (Prisma-backed, see src/lib/realEstateData.ts), the lead pipeline that
// tracks interest against a Property (properties/ sub-page). Enquiry has
// no lead name/contact columns in the migrated schema (see prisma/schema.prisma's
// doc comment on the model) — an enquiry is identified by its id, its
// linked Property, and its pipeline stage.

const STAGE_VARIANT: Record<string, StatusVariant> = {
  New: "neutral",
  "Site Visit Scheduled": "warning",
  Negotiation: "teal",
  "Agreement Signed": "success",
  "Closed/Lost": "danger",
};

export const realEstateColumns: Column[] = [
  { key: "id", label: "Enquiry ID", type: "text" },
  { key: "propertyAddress", label: "Property", type: "relation-link" },
  { key: "stage", label: "Stage", type: "select-chip", chipVariantMap: STAGE_VARIANT },
  { key: "agentName", label: "Agent", type: "text" },
  { key: "siteVisitStart", label: "Site Visit", type: "date" },
  { key: "dealValue", label: "Deal Value", type: "currency" },
  { key: "commissionAmount", label: "Commission", type: "currency" },
];

/**
 * Static sample rows kept only for MODULE_DATA (src/lib/moduleData.ts),
 * the cross-module dashboard/analytics registry — not used by any real
 * page in this module, which reads live Enquiry rows via enquiryToRow.
 */
export const realEstateRows: Row[] = [
  {
    id: "sample-enq-1",
    propertyAddress: "3BHK, Prestige Falcon City, Kanakapura Rd",
    stage: "Site Visit Scheduled",
    agentName: "Deepika Shetty",
    siteVisitStart: "2026-08-10T10:00:00",
    dealValue: 9800000,
    commissionAmount: 0,
  },
];

export const realEstateFormFields: FormFieldDef[] = [
  { key: "propertyId", label: "Property", type: "select", required: false, options: [] },
  { key: "agentName", label: "Agent", type: "text", required: false },
  { key: "stage", label: "Stage", type: "select", required: false, options: ["New", "Site Visit Scheduled", "Negotiation", "Agreement Signed", "Closed/Lost"] },
];

export function enquiryToRow(e: EnquiryRow): Row {
  return {
    id: e.id,
    propertyId: e.propertyId ?? "",
    propertyAddress: e.propertyAddress ?? "—",
    stage: e.stage,
    agentName: e.agentName ?? "",
    siteVisitStart: e.siteVisitStart ? e.siteVisitStart.toISOString() : "",
    siteVisitEnd: e.siteVisitEnd ? e.siteVisitEnd.toISOString() : "",
    dealValue: paiseToRupees(e.dealValue),
    commissionPct: e.commissionPct ?? "",
    commissionAmount: paiseToRupees(e.commissionAmount),
    closedLostReason: e.closedLostReason ?? "",
  };
}

export function getRealEstateDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Enquiry ID", value: r["id"], type: "text" },
    { label: "Property", value: r["propertyAddress"], type: "relation" },
    { label: "Stage", value: r["stage"], type: "select", chipVariant: STAGE_VARIANT[String(r["stage"])] ?? "neutral" },
    { label: "Agent", value: r["agentName"], type: "text" },
    { label: "Site Visit Start", value: r["siteVisitStart"], type: "date" },
    { label: "Site Visit End", value: r["siteVisitEnd"], type: "date" },
    { label: "Deal Value", value: r["dealValue"], type: "currency" },
    { label: "Commission %", value: r["commissionPct"], type: "text" },
    { label: "Commission Amount", value: r["commissionAmount"], type: "currency" },
    { label: "Closed/Lost Reason", value: r["closedLostReason"], type: "text" },
  ];
}

export function getRealEstateTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Enquiry created${record["propertyAddress"] ? ` for ${record["propertyAddress"]}` : ""}`, timestamp: "2026-06-01T11:00:00", actor: "Agent" },
    { id: "t2", label: "Stage updated as the lead progressed", timestamp: "2026-07-10T09:00:00", actor: "Agent" },
  ];
}

export const realEstateRelated: RelatedRecord[] = [];

/** Lead pipeline lifecycle, read directly off an Enquiry-derived Row. */
export interface RealEstateLifecycle {
  stage: LeadStage;
  agentId?: string;
  agentName?: string;
  siteVisitStart?: string;
  siteVisitEnd?: string;
  dealValue?: number;
  commissionPct?: number;
  commissionAmount?: number;
  closedLostReason?: string;
}

/**
 * Reads the lead-pipeline lifecycle fields off an Enquiry-derived Row.
 * Enquiry has no agentId column — agentName doubles as the identity used
 * for the site-visit conflict check (see [recordId]/actions.ts).
 */
export function extractRealEstateLifecycle(record: Row): RealEstateLifecycle {
  return {
    stage: (record["stage"] as LeadStage | undefined) ?? "New",
    agentId: record["agentName"] as string | undefined,
    agentName: record["agentName"] as string | undefined,
    siteVisitStart: (record["siteVisitStart"] as string | undefined) || undefined,
    siteVisitEnd: (record["siteVisitEnd"] as string | undefined) || undefined,
    dealValue: (record["dealValue"] as number | undefined) || undefined,
    commissionPct: (record["commissionPct"] as number | undefined) || undefined,
    commissionAmount: (record["commissionAmount"] as number | undefined) || undefined,
    closedLostReason: record["closedLostReason"] as string | undefined,
  };
}
