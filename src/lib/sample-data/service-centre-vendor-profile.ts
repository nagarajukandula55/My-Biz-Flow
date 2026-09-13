import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Vendor Profile — a sub-vendor / outsourced repair partner that THIS
 * Service Centre partner works with (e.g. a specialist screen-repair shop
 * a job gets outsourced to, or a spare-parts supplier). Ported from
 * AN-CRM's src/models/VendorProfile.ts.
 *
 * Deliberately NOT modeled on My-Biz-Flow's own `Partner` Prisma model,
 * even though AN-CRM's VendorProfile and Partner both onboard a business
 * with an approval lifecycle. Reasoning (per prisma/schema.prisma's own
 * comment on Partner): a My-Biz-Flow `Partner` IS the tenant account
 * itself — it logs in, owns a subscription/plan, and gets a VND#### id
 * used for the partner's own login/invoices/support. AN-CRM's
 * VendorProfile is a different relationship entirely: it's a business
 * *that this tenant's Service Centre deals with* (a sub-contractor or
 * supplier), scoped under a single partner, with no login of its own —
 * exactly the shape of every other BusinessRecord-backed catalog in this
 * module (Brands, Models, Solutions, Fault/Symptom Codes), not a new
 * tenant. So it belongs here, under service-centre/vendor-profile/,
 * following the exact same Column/FormFieldDef/DataTable/RecordForm/
 * RecordDetail convention as scBrandColumns etc., rather than extending
 * Partner or Prisma.
 *
 * parentVendorId supports a simple one-level-deep sub-vendor hierarchy
 * (e.g. a regional vendor with local branches), same idea as AN-CRM's
 * parentVendorId — resolved by id against this same catalog.
 */

const ONBOARDING_STATUS_VARIANT: Record<string, StatusVariant> = {
  APPLIED: "neutral",
  AGREEMENT_DRAFTED: "amber",
  AGREEMENT_SENT: "amber",
  AGREEMENT_SIGNED: "teal",
  APPROVED: "teal",
  ACTIVE: "success",
  INACTIVE: "neutral",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export const ONBOARDING_STATUSES = [
  "APPLIED",
  "AGREEMENT_DRAFTED",
  "AGREEMENT_SENT",
  "AGREEMENT_SIGNED",
  "APPROVED",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "SUSPENDED",
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const scVendorProfileColumns: Column[] = [
  { key: "id", label: "Vendor Code", type: "text" },
  { key: "businessName", label: "Business Name", type: "text" },
  { key: "onboardingStatus", label: "Onboarding Status", type: "select-chip", chipVariantMap: ONBOARDING_STATUS_VARIANT },
  { key: "parentVendorId", label: "Parent Vendor", type: "text" },
  { key: "gstin", label: "GSTIN", type: "text" },
  { key: "pan", label: "PAN", type: "text" },
  { key: "serviceArea", label: "Service Area", type: "text" },
  { key: "serviceRadiusKm", label: "Service Radius (km)", type: "text" },
  { key: "rating", label: "Rating", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scVendorProfileRows: Row[] = [
  {
    id: "SVP-001",
    businessName: "Precision Screen Repairs",
    onboardingStatus: "ACTIVE",
    parentVendorId: "",
    gstin: "29ABCPS1234K1Z5",
    pan: "ABCPS1234K",
    bankAccountName: "Precision Screen Repairs",
    bankAccountNumber: "50100234567890",
    bankIFSC: "HDFC0001234",
    serviceArea: "Koramangala, HSR Layout",
    serviceRadiusKm: 8,
    kycDocRef: "",
    agreementDocRef: "",
    rating: 4.6,
    status: "Active",
    moduleSlug: "service-centre",
  },
  {
    id: "SVP-002",
    businessName: "Metro Spares Distributors",
    onboardingStatus: "AGREEMENT_SENT",
    parentVendorId: "",
    gstin: "29XYZMS5678L1Z2",
    pan: "XYZMS5678L",
    bankAccountName: "Metro Spares Distributors",
    bankAccountNumber: "50200987654321",
    bankIFSC: "ICIC0005678",
    serviceArea: "Bangalore Urban",
    serviceRadiusKm: 25,
    kycDocRef: "",
    agreementDocRef: "",
    rating: 4.1,
    status: "Active",
    moduleSlug: "service-centre",
  },
];

export const scVendorProfileFormFields: FormFieldDef[] = [
  { key: "id", label: "Vendor Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "businessName", label: "Business Name", type: "text", required: true },
  { key: "onboardingStatus", label: "Onboarding Status", type: "select", required: true, options: [...ONBOARDING_STATUSES] },
  { key: "parentVendorId", label: "Parent Vendor Code (for a sub-vendor / branch)", type: "text", required: false },
  { key: "gstin", label: "GSTIN", type: "text", required: false },
  { key: "pan", label: "PAN", type: "text", required: false },
  { key: "bankAccountName", label: "Bank Account Holder Name", type: "text", required: false },
  { key: "bankAccountNumber", label: "Bank Account Number", type: "text", required: false },
  { key: "bankIFSC", label: "Bank IFSC", type: "text", required: false },
  { key: "serviceArea", label: "Service Area", type: "text", required: false, placeholder: "Localities / city covered" },
  { key: "serviceRadiusKm", label: "Service Radius (km)", type: "number", required: false },
  { key: "kycDocRef", label: "KYC Document Ref", type: "text", required: false, placeholder: "Uploaded document id/URL" },
  { key: "agreementDocRef", label: "Agreement Document Ref", type: "text", required: false, placeholder: "Uploaded document id/URL" },
  { key: "rating", label: "Rating (out of 5)", type: "number", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScVendorProfileRecord(recordId: string): Row {
  return scVendorProfileRows.find((r) => String(r["id"]) === recordId) ?? scVendorProfileRows[0];
}

export function getScVendorProfileDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Vendor Code", value: r["id"], type: "text" },
    { label: "Business Name", value: r["businessName"], type: "text" },
    { label: "Onboarding Status", value: r["onboardingStatus"], type: "select", chipVariant: ONBOARDING_STATUS_VARIANT[String(r["onboardingStatus"])] ?? "neutral" },
    { label: "Parent Vendor", value: r["parentVendorId"], type: "text" },
    { label: "GSTIN", value: r["gstin"], type: "text" },
    { label: "PAN", value: r["pan"], type: "text" },
    { label: "Bank Account Holder Name", value: r["bankAccountName"], type: "text" },
    { label: "Bank Account Number", value: r["bankAccountNumber"], type: "text" },
    { label: "Bank IFSC", value: r["bankIFSC"], type: "text" },
    { label: "Service Area", value: r["serviceArea"], type: "text" },
    { label: "Service Radius (km)", value: r["serviceRadiusKm"], type: "text" },
    { label: "KYC Document Ref", value: r["kycDocRef"], type: "text" },
    { label: "Agreement Document Ref", value: r["agreementDocRef"], type: "text" },
    { label: "Rating", value: r["rating"], type: "text" },
    { label: "Status", value: r["status"], type: "select" },
  ];
}

export function getScVendorProfileTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Vendor "${record["businessName"]}" applied for onboarding`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" },
    { id: "t2", label: `Onboarding status set to ${record["onboardingStatus"]}`, timestamp: "2026-07-05T11:00:00", actor: "Partner Admin" },
  ];
}

export const scVendorProfileRelated: RelatedRecord[] = [];

/** Dropdown options for use elsewhere (e.g. BOM's Supplier / Vendor Ref field), filtered to Active. */
export function getScVendorProfileOptions(): { value: string; label: string }[] {
  return scVendorProfileRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["id"]} — ${r["businessName"]}` }));
}
