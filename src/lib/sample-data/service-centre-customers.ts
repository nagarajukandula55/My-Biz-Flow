import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { INDIAN_STATES } from "@/lib/sample-data/geo";

// A partner's own standing customer directory — distinct from the
// per-workorder customer* fields on a Service Centre job (customer,
// customerPhone, customerGstin, customerAddress, ...), which are a
// point-in-time snapshot on that one job, not a real customer database.
// Field set mirrors AN-CRM's real Customer model (src/models/Customer.ts):
// name/phone/email/gstin/address/city/state/pincode/notes/isActive, minus
// the fields that only make sense inside AN-CRM's own aggregation-across-
// businesses design (businessId, source, sourceModule, vendorId,
// imeiOrSerialNumbers, customFields) — this module is one partner's own
// data, so none of that cross-business plumbing applies here.

export const customersColumns: Column[] = [
  { key: "id", label: "Customer Code", type: "text" },
  { key: "name", label: "Customer Name", type: "text" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "city", label: "City", type: "text" },
  { key: "gstin", label: "GSTIN", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const customersRows: Row[] = [
  {
    id: "CUST-001",
    name: "Ravi Kumar",
    phone: "9876543210",
    email: "ravi.kumar@example.com",
    address: "12 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    gstin: "",
    notes: "Prefers WhatsApp updates.",
    status: "Active",
    moduleSlug: "service-centre-customers",
  },
  {
    id: "CUST-002",
    name: "Priya Sharma",
    phone: "9812345678",
    email: "priya.sharma@example.com",
    address: "45 Park Street",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700016",
    gstin: "",
    notes: "",
    status: "Active",
    moduleSlug: "service-centre-customers",
  },
  {
    id: "CUST-003",
    name: "Sri Enterprises",
    phone: "9900112233",
    email: "accounts@srienterprises.in",
    address: "7 Industrial Estate",
    city: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "641021",
    gstin: "33AAECS1234F1Z5",
    notes: "B2B account — bulk repairs, GST invoicing required.",
    status: "Active",
    moduleSlug: "service-centre-customers",
  },
  {
    id: "CUST-004",
    name: "Anita Desai",
    phone: "9765432109",
    email: "",
    address: "",
    city: "Pune",
    state: "Maharashtra",
    pincode: "",
    gstin: "",
    notes: "Moved out of service area.",
    status: "Inactive",
    moduleSlug: "service-centre-customers",
  },
];

export const customersFormFields: FormFieldDef[] = [
  { key: "id", label: "Customer Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "name", label: "Customer Name", type: "text", required: true },
  { key: "phone", label: "Phone", type: "phone", required: true },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "address", label: "Address", type: "text", required: false },
  { key: "city", label: "City", type: "text", required: false },
  { key: "state", label: "State", type: "select", required: false, options: [...INDIAN_STATES] },
  { key: "pincode", label: "Pincode", type: "text", required: false },
  // Optional — only B2B customers carry one; leaving it blank is normal.
  { key: "gstin", label: "GSTIN", type: "text", required: false },
  { key: "notes", label: "Notes", type: "textarea", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getCustomerRecord(recordId: string): Row {
  return customersRows.find((r) => String(r["id"]) === recordId) ?? customersRows[0];
}

export function getCustomerDetailFields(record: Row): RecordField[] {
  return [
    { label: "Customer Code", value: record["id"], type: "text" },
    { label: "Customer Name", value: record["name"], type: "text" },
    { label: "Phone", value: record["phone"], type: "phone" },
    { label: "Email", value: record["email"], type: "email" },
    { label: "Address", value: record["address"], type: "text" },
    { label: "City", value: record["city"], type: "text" },
    { label: "State", value: record["state"], type: "text" },
    { label: "Pincode", value: record["pincode"], type: "text" },
    { label: "GSTIN", value: record["gstin"], type: "text" },
    { label: "Notes", value: record["notes"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getCustomerTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Customer "${record["name"]}" added`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" }];
}

export const customersRelated: RelatedRecord[] = [];

export function getCustomerOptions(): { value: string; label: string }[] {
  return customersRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}
