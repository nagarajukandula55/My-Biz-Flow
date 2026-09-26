import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";
import type { SalonAppointmentRecord } from "@/lib/salonSpa/appointmentsData";
import type { SalonServiceRecord } from "@/lib/salonSpa/servicesData";

// Field/column definitions for the Salon & Spa module — real data now comes
// from SalonAppointment/SalonService (Prisma), not BusinessRecord/static
// rows; this file keeps only the Column/FormFieldDef/RecordField vocabulary
// (see CLAUDE.md) plus the row-shaping helpers the pages call.

export const SALON_STATUS_VARIANT: Record<string, StatusVariant> = {
  Booked: "teal",
  "In Progress": "warning",
  Completed: "success",
  Cancelled: "danger",
  "No-show": "danger",
};

/** Default appointment slot length (minutes) used for schedule-conflict-window checks when a service has no explicit duration. */
export const DEFAULT_BOOKING_DURATION_MINUTES = 30;

export const salonSpaColumns: Column[] = [
  { key: "id", label: "Booking ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "serviceName", label: "Service", type: "select-chip" },
  { key: "stylist", label: "Stylist / Therapist", type: "text" },
  { key: "durationMinutes", label: "Duration (min)", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: SALON_STATUS_VARIANT },
  { key: "appointmentDate", label: "Appointment Date", type: "date" },
  { key: "branch", label: "Branch", type: "text" },
  { key: "commissionPercent", label: "Stylist Commission %", type: "text" },
];

/** Static field defs for the appointment form; the "serviceId" field's `options`/`optionLabels` are
 * filled in per-request by the page (from the partner's real active SalonService catalog) via
 * buildSalonSpaFormFields() below — a service catalog is partner-specific data, not a fixed list. */
export const salonSpaFormFields: FormFieldDef[] = [
  { key: "customer", label: "Customer", type: "relation", required: true },
  { key: "serviceId", label: "Service", type: "select", required: true, options: [] },
  { key: "stylist", label: "Stylist / Therapist", type: "text", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: [...Object.keys(SALON_STATUS_VARIANT)], createHidden: true },
  { key: "appointmentDate", label: "Appointment Date", type: "datetime", required: true },
  { key: "branch", label: "Branch", type: "text", required: false },
  { key: "commissionPercent", label: "Stylist Commission %", type: "percentage", required: false, placeholder: "15" },
];

/** Injects the partner's real active services as the Service field's options (value = service id). */
export function buildSalonSpaFormFields(services: SalonServiceRecord[]): FormFieldDef[] {
  const options = services.map((s) => s.id);
  const optionLabels = Object.fromEntries(services.map((s) => [s.id, `${s.name} — ₹${s.price} (${s.durationMinutes} min)`]));
  return salonSpaFormFields.map((f) => (f.key === "serviceId" ? { ...f, options, optionLabels } : f));
}

export const salonServiceFormFields: FormFieldDef[] = [
  { key: "name", label: "Service Name", type: "text", required: true, placeholder: "Haircut & Style" },
  { key: "durationMinutes", label: "Duration (min)", type: "number", required: true, placeholder: "30" },
  { key: "price", label: "Price", type: "currency", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false, createHidden: true },
];

export const salonServiceColumns: Column[] = [
  { key: "name", label: "Service Name", type: "text" },
  { key: "durationMinutes", label: "Duration (min)", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "isActive", label: "Active", type: "text" },
];

export function salonAppointmentToRow(r: SalonAppointmentRecord): Row {
  return {
    id: r.id,
    customer: r.customer,
    serviceId: r.serviceId ?? "",
    serviceName: r.serviceName,
    stylist: r.stylist,
    durationMinutes: r.durationMinutes,
    price: r.price,
    status: r.status,
    appointmentDate: r.appointmentDate.toISOString(),
    branch: r.branch ?? "",
    commissionPercent: r.commissionPercent ?? "",
    commissionAmount: r.commissionAmount ?? "",
    invoiceId: r.invoiceId ?? "",
  };
}

export function salonServiceToRow(s: SalonServiceRecord): Row {
  return {
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price,
    isActive: s.isActive ? "Yes" : "No",
  };
}

export function getSalonSpaDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Booking ID", value: r["id"], type: "text" },
    { label: "Customer", value: r["customer"], type: "relation" },
    { label: "Service", value: r["serviceName"], type: "select", chipVariant: "neutral" },
    { label: "Stylist / Therapist", value: r["stylist"], type: "text" },
    { label: "Duration (min)", value: r["durationMinutes"], type: "text" },
    { label: "Price", value: r["price"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: SALON_STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Appointment Date", value: r["appointmentDate"], type: "date" },
    { label: "Branch", value: r["branch"], type: "text" },
    { label: "Stylist Commission %", value: r["commissionPercent"] || 0, type: "percentage" },
    { label: "Commission Amount", value: r["commissionAmount"] || "Not yet computed (completed bookings only)", type: r["commissionAmount"] ? "currency" : "text" },
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
