import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Booking sample data for the salon-spa module — realistic field modeling,
// same generic-CRUD pattern as every other un-deepened module (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Booked: "teal",
  "In Progress": "warning",
  Completed: "success",
  Cancelled: "danger",
  "No-show": "danger",
};

export const salonSpaColumns: Column[] = [
  { key: "id", label: "Booking ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "service", label: "Service", type: "select-chip" },
  { key: "stylist", label: "Stylist / Therapist", type: "text" },
  { key: "duration", label: "Duration (min)", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "appointmentDate", label: "Appointment Date", type: "date" },
  { key: "branch", label: "Branch", type: "text" },
  { key: "commissionPercent", label: "Stylist Commission %", type: "text" },
];

/** Default booking slot length (minutes) used for schedule-conflict-window checks when a booking has no explicit duration. */
export const DEFAULT_BOOKING_DURATION_MINUTES = 30;

export const salonSpaRows: Row[] = [
  {
    id: "BKG-3301",
    customer: "Anita Rao",
    service: "Haircut & Style",
    stylist: "Divya S.",
    duration: 45,
    price: 600,
    status: "Booked",
    appointmentDate: "2026-09-06T11:00:00",
    branch: "Indiranagar",
    commissionPercent: 15,
  },
  {
    id: "BKG-3300",
    customer: "Karthik Iyer",
    service: "Deep Tissue Massage",
    stylist: "Rohan T.",
    duration: 60,
    price: 1400,
    status: "Completed",
    appointmentDate: "2026-09-05T15:30:00",
    branch: "Koramangala",
    commissionPercent: 20,
    commissionAmount: 280,
  },
  {
    id: "BKG-3299",
    customer: "Meera Pillai",
    service: "Manicure & Pedicure",
    stylist: "Sana K.",
    duration: 50,
    price: 900,
    status: "In Progress",
    appointmentDate: "2026-09-05T14:00:00",
    branch: "Indiranagar",
    commissionPercent: 15,
  },
  {
    id: "BKG-3298",
    customer: "Farhan Ali",
    service: "Facial",
    stylist: "Divya S.",
    duration: 40,
    price: 1100,
    status: "No-show",
    appointmentDate: "2026-09-04T17:00:00",
    branch: "HSR Layout",
    commissionPercent: 15,
  },
];

export const salonSpaFormFields: FormFieldDef[] = [
  { key: "id", label: "Booking ID", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "service", label: "Service", type: "select", required: true, options: ["Haircut & Style", "Hair Coloring", "Facial", "Manicure & Pedicure", "Deep Tissue Massage", "Aromatherapy", "Waxing", "Bridal Package"] },
  { key: "stylist", label: "Stylist / Therapist", type: "text", required: true },
  { key: "duration", label: "Duration (min)", type: "number", required: true },
  { key: "price", label: "Price", type: "currency", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Booked", "In Progress", "Completed", "Cancelled", "No-show"] },
  { key: "appointmentDate", label: "Appointment Date", type: "datetime", required: true },
  { key: "branch", label: "Branch", type: "text", required: false },
  { key: "commissionPercent", label: "Stylist Commission %", type: "percentage", required: false, placeholder: "15" },
];

export function getSalonSpaRecord(recordId: string): Row {
  return salonSpaRows.find((r) => String(r["id"]) === recordId) ?? salonSpaRows[0];
}

export function getSalonSpaDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Booking ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    { label: "Service", value: r["service"], type: "select", chipVariant: "neutral" },
    { label: "Stylist / Therapist", value: r["stylist"], type: "text" },
    { label: "Duration (min)", value: r["duration"], type: "text" },
    { label: "Price", value: r["price"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Appointment Date", value: r["appointmentDate"], type: "date" },
    { label: "Branch", value: r["branch"], type: "text" },
    { label: "Stylist Commission %", value: r["commissionPercent"] ?? 0, type: "percentage" },
    { label: "Commission Amount", value: r["commissionAmount"] ?? "Not yet computed (completed bookings only)", type: r["commissionAmount"] ? "currency" : "text" },
    { label: "Invoice", value: r["invoiceId"] || "Not yet invoiced", type: "text" },
  ];
}

export function getSalonSpaTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Booking created", timestamp: String(record["appointmentDate"] ?? ""), actor: "Front desk" },
    { id: "t2", label: `Assigned to ${record["stylist"] ?? "stylist"}`, timestamp: String(record["appointmentDate"] ?? ""), actor: "Front desk" },
    { id: "t3", label: `Status: ${record["status"] ?? "—"}`, timestamp: String(record["appointmentDate"] ?? ""), actor: String(record["stylist"] ?? "") },
  ];
}

export const salonSpaRelated: RelatedRecord[] = [];
