import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { SERVICE_TYPES, serviceTypeLabel } from "@/lib/serviceTypes";

// Inquiries logged before a workorder exists — a customer calling in, or
// the public Book Appointment form submitting one directly. Own module
// slug ("service-centre-inquiry", distinct from "service-centre" which is
// the Workorder table) so an inquiry never shows up mixed into the
// Workorder list, same convention Brands/Models/Customers/Solutions use.
//
// Lifecycle is deliberately just three states, not a richer pipeline:
// Open -> Converted to Workorder | Closed. Converting links forward to the
// workorder it became (convertedToWorkorderId); closing requires a reason
// so the dashboard can actually summarize WHY inquiries don't turn into
// business, not just that they didn't.

export const INQUIRY_STATUSES = ["Open", "Converted", "Closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_VARIANT: Record<string, "neutral" | "teal" | "success" | "warning" | "danger"> = {
  Open: "teal",
  Converted: "success",
  Closed: "neutral",
};

/** Standardised close reasons — a dropdown, not free text, so the dashboard can summarize by reason. */
export const INQUIRY_CLOSE_REASONS = [
  "Customer not interested",
  "Price declined",
  "Went to another service centre",
  "No fault found",
  "Duplicate inquiry",
  "Could not reach customer",
  "Other",
] as const;

export const inquiryColumns: Column[] = [
  { key: "id", label: "Inquiry No", type: "text" },
  { key: "customerName", label: "Customer Name", type: "text" },
  { key: "customerPhone", label: "Phone", type: "text" },
  { key: "serviceType", label: "Service Type", type: "select-chip" },
  { key: "complaint", label: "Complaint", type: "text" },
  { key: "pincode", label: "Pincode", type: "text" },
  { key: "source", label: "Source", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: INQUIRY_STATUS_VARIANT },
  { key: "createdAt", label: "Logged On", type: "text" },
];

export const inquiryFormFields: FormFieldDef[] = [
  { key: "customerName", label: "Customer Name", type: "text", required: true },
  { key: "customerPhone", label: "Phone", type: "text", required: true },
  {
    key: "serviceType",
    label: "Service Type",
    type: "select",
    required: true,
    options: SERVICE_TYPES.map((t) => t.code),
  },
  { key: "complaint", label: "Complaint / What the customer needs", type: "textarea", required: true },
  { key: "brand", label: "Brand", type: "text", required: false },
  { key: "model", label: "Model", type: "text", required: false },
  { key: "addressLine", label: "Address", type: "text", required: false },
  { key: "pincode", label: "Pincode", type: "text", required: false },
  { key: "preferredDate", label: "Preferred Date", type: "date", required: false },
];

export function getInquiryDetailFields(record: Row): RecordField[] {
  return [
    { label: "Inquiry No", value: record["id"], type: "text" },
    { label: "Customer Name", value: record["customerName"], type: "text" },
    { label: "Phone", value: record["customerPhone"], type: "text" },
    { label: "Service Type", value: serviceTypeLabel(String(record["serviceType"] ?? "")), type: "text" },
    { label: "Complaint", value: record["complaint"], type: "text" },
    { label: "Brand / Model", value: [record["brand"], record["model"]].filter(Boolean).join(" ") || "—", type: "text" },
    { label: "Address", value: record["addressLine"], type: "text" },
    { label: "Pincode", value: record["pincode"], type: "text" },
    { label: "Preferred Date", value: record["preferredDate"], type: "text" },
    { label: "Source", value: record["source"] ?? "Staff", type: "text" },
    { label: "Status", value: record["status"], type: "select" },
    ...(record["status"] === "Closed"
      ? [{ label: "Close Reason", value: record["closeReason"], type: "text" as const }]
      : []),
    ...(record["status"] === "Converted"
      ? [{ label: "Converted To Workorder", value: record["convertedToWorkorderId"], type: "text" as const }]
      : []),
  ];
}

export function getInquiryTimeline(record: Row): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: "t1",
      label: `Inquiry logged${record["source"] === "Public Booking" ? " via public Book Appointment form" : ""}`,
      timestamp: String(record["createdAt"] ?? ""),
      actor: record["source"] === "Public Booking" ? "Customer" : "Staff",
    },
  ];
  if (record["status"] === "Closed") {
    entries.push({
      id: "t2",
      label: `Closed — ${record["closeReason"] ?? "No reason given"}`,
      timestamp: String(record["closedAt"] ?? ""),
      actor: "Staff",
    });
  }
  if (record["status"] === "Converted") {
    entries.push({
      id: "t2",
      label: `Converted to workorder ${record["convertedToWorkorderId"] ?? ""}`,
      timestamp: String(record["convertedAt"] ?? ""),
      actor: "Staff",
    });
  }
  return entries;
}

export const inquiryRelated: RelatedRecord[] = [];
