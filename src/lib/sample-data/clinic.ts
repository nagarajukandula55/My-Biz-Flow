import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Appointment sample data for the clinic module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Scheduled": "teal",
  "In consultation": "warning",
  "Completed": "success",
  "No-show": "danger",
  "Cancelled": "neutral"
};

export const clinicColumns: Column[] = [
  { key: "id", label: "Patient ID", type: "text" },
  { key: "patientName", label: "Patient Name", type: "text" },
  { key: "doctor", label: "Doctor", type: "relation-link" },
  { key: "appointmentDateTime", label: "Appointment Date/Time", type: "date" },
  { key: "diagnosis", label: "Diagnosis", type: "text" },
  { key: "consultationFee", label: "Consultation Fee", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "insuranceProvider", label: "Insurance Provider", type: "text" },
];

export const clinicRows: Row[] = [
  {
    id: "PT-5502",
    patientName: "Anjali Verma",
    doctor: "Dr. Kavitha Rao",
    appointmentDateTime: "2026-08-07T11:30:00",
    diagnosis: "Seasonal allergic rhinitis",
    consultationFee: 600,
    status: "Completed",
    insuranceProvider: "Star Health",
  },
  {
    id: "PT-5501",
    patientName: "Manoj Tiwari",
    doctor: "Dr. Suresh Iyer",
    appointmentDateTime: "2026-08-07T14:00:00",
    diagnosis: "Pending — routine check-up",
    consultationFee: 500,
    status: "Scheduled",
    insuranceProvider: "—",
  },
  {
    id: "PT-5500",
    patientName: "Fatima Sheikh",
    doctor: "Dr. Kavitha Rao",
    appointmentDateTime: "2026-08-06T16:15:00",
    diagnosis: "Type 2 diabetes — follow-up",
    consultationFee: 700,
    status: "In consultation",
    insuranceProvider: "HDFC Ergo",
  },
  {
    id: "PT-5499",
    patientName: "Karthik Subramaniam",
    doctor: "Dr. Neha Bansal",
    appointmentDateTime: "2026-08-05T09:45:00",
    diagnosis: "N/A",
    consultationFee: 500,
    status: "No-show",
    insuranceProvider: "—",
  },
];

export const clinicFormFields: FormFieldDef[] = [
  { key: "id", label: "Patient ID", type: "text", required: true },
  { key: "patientName", label: "Patient Name", type: "text", required: true },
  { key: "doctor", label: "Doctor", type: "relation", required: true },
  { key: "appointmentDateTime", label: "Appointment Date/Time", type: "date", required: true },
  { key: "diagnosis", label: "Diagnosis", type: "textarea", required: false },
  { key: "consultationFee", label: "Consultation Fee", type: "currency", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Scheduled","In consultation","Completed","No-show","Cancelled"] },
  { key: "insuranceProvider", label: "Insurance Provider", type: "text", required: false },
];

export function getClinicRecord(recordId: string): Row {
  return clinicRows.find((r) => String(r["id"]) === recordId) ?? clinicRows[0];
}

export function getClinicDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Patient ID", value: r["id"], type: "text" },
    { label: "Patient Name", value: r["patientName"], type: "text" },
    { label: "Doctor", value: r["doctor"], type: "relation" },
    { label: "Appointment Date/Time", value: r["appointmentDateTime"], type: "date" },
    { label: "Diagnosis", value: r["diagnosis"], type: "text" },
    { label: "Consultation Fee", value: r["consultationFee"], type: "currency" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Insurance Provider", value: r["insuranceProvider"], type: "text" },
  ];
}

export function getClinicTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Appointment booked by front-desk staff — IP 103.21.44.14", timestamp: "2026-08-03T09:00:00", actor: "Reception" },
    { id: "t2", label: "Patient checked in for consultation", timestamp: "2026-08-07T10:05:00", actor: "Reception" },
    { id: "t3", label: "Diagnosis and prescription recorded by Dr. Nair — IP 103.21.44.19", timestamp: "2026-08-07T10:40:00", actor: "Dr. Nair" },
    { id: "t4", label: "Consultation fee collected at counter — IP 103.21.44.14", timestamp: "2026-08-07T10:55:00", actor: "Reception" },
  ];
}

export const clinicRelated: RelatedRecord[] = [];
