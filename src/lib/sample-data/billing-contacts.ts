import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Contacts (Customers & Vendors) for the Billing module — invoices,
 * credit/debit notes and payments reference a Contact by id instead of a
 * free-text name. Real persistence: BusinessRecord moduleSlug
 * "billing-contacts" (see src/lib/businessRecords.ts).
 */

const CONTACT_TYPE_VARIANT: Record<string, StatusVariant> = {
  Customer: "teal",
  Vendor: "amber",
  Both: "success",
};

export const CONTACT_TYPES = ["Customer", "Vendor", "Both"] as const;

export const billingContactColumns: Column[] = [
  { key: "id", label: "Contact ID", type: "text" },
  { key: "name", label: "Name", type: "text" },
  { key: "type", label: "Type", type: "select-chip", chipVariantMap: CONTACT_TYPE_VARIANT },
  { key: "gstin", label: "GSTIN", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "city", label: "City", type: "text" },
];

export const billingContactFormFields: FormFieldDef[] = [
  { key: "id", label: "Contact ID", type: "text", required: false },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "type", label: "Type", type: "select", required: true, options: [...CONTACT_TYPES] },
  { key: "gstin", label: "GSTIN", type: "text", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "phone", label: "Phone", type: "phone", required: false },
  { key: "billingAddress", label: "Billing Address", type: "textarea", required: false },
  { key: "city", label: "City", type: "text", required: false },
  { key: "state", label: "State", type: "text", required: false },
  { key: "pincode", label: "Pincode", type: "text", required: false },
];

export function getBillingContactDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Contact ID", value: r["id"], type: "text" },
    { label: "Name", value: r["name"], type: "text" },
    { label: "Type", value: r["type"], type: "select", chipVariant: CONTACT_TYPE_VARIANT[String(r["type"])] ?? "neutral" },
    { label: "GSTIN", value: r["gstin"], type: "text" },
    { label: "Email", value: r["email"], type: "text" },
    { label: "Phone", value: r["phone"], type: "phone" },
    { label: "Billing Address", value: r["billingAddress"], type: "text" },
    { label: "City", value: r["city"], type: "text" },
    { label: "State", value: r["state"], type: "text" },
    { label: "Pincode", value: r["pincode"], type: "text" },
  ];
}

export function getBillingContactTimeline(): TimelineEntry[] {
  return [
    { id: "t1", label: "Contact added to Billing", timestamp: new Date().toISOString(), actor: "System" },
  ];
}

export const billingContactRelated: RelatedRecord[] = [];
