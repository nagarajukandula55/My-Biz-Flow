import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Enrollment sample data for the education module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Active": "success",
  "Completed": "teal",
  "Dropped": "danger"
};

export const educationColumns: Column[] = [
  { key: "id", label: "Student ID", type: "text" },
  { key: "studentName", label: "Student Name", type: "text" },
  { key: "batch", label: "Batch", type: "relation-link" },
  { key: "course", label: "Course", type: "text" },
  { key: "enrollmentDate", label: "Enrollment Date", type: "date" },
  { key: "feeAmount", label: "Fee Amount", type: "currency" },
  { key: "feeStatus", label: "Fee Status", type: "select-chip" },
  { key: "attendancePercent", label: "Attendance (%)", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const educationRows: Row[] = [
  {
    id: "STU-6601",
    studentName: "Aarav Mehta",
    batch: "JEE Batch — Aug 2026",
    course: "Physics + Chemistry + Maths",
    enrollmentDate: "2026-06-01",
    feeAmount: 45000,
    feeStatus: "Paid",
    attendancePercent: 92,
    status: "Active",
  },
  {
    id: "STU-6600",
    studentName: "Zoya Khan",
    batch: "Spoken English — Evening",
    course: "Spoken English",
    enrollmentDate: "2026-07-10",
    feeAmount: 6000,
    feeStatus: "Partially Paid",
    attendancePercent: 78,
    status: "Active",
  },
  {
    id: "STU-6599",
    studentName: "Rahul Chandran",
    batch: "UPSC Foundation 2026",
    course: "General Studies",
    enrollmentDate: "2025-11-05",
    feeAmount: 60000,
    feeStatus: "Paid",
    attendancePercent: 65,
    status: "Dropped",
  },
  {
    id: "STU-6598",
    studentName: "Neha Joshi",
    batch: "CAT Crash Course",
    course: "Quant + Verbal",
    enrollmentDate: "2026-05-20",
    feeAmount: 15000,
    feeStatus: "Paid",
    attendancePercent: 88,
    status: "Completed",
  },
];

export const educationFormFields: FormFieldDef[] = [
  { key: "id", label: "Student ID", type: "text", required: true },
  { key: "studentName", label: "Student Name", type: "text", required: true },
  { key: "batch", label: "Batch", type: "relation", required: true },
  { key: "course", label: "Course", type: "text", required: true },
  { key: "enrollmentDate", label: "Enrollment Date", type: "date", required: true },
  { key: "feeAmount", label: "Fee Amount", type: "currency", required: true },
  { key: "feeStatus", label: "Fee Status", type: "select", required: false, options: ["Paid","Partially Paid","Pending"] },
  { key: "attendancePercent", label: "Attendance (%)", type: "number", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Completed","Dropped"] },
];

export function getEducationRecord(recordId: string): Row {
  return educationRows.find((r) => String(r["id"]) === recordId) ?? educationRows[0];
}

export function getEducationDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Student ID", value: r["id"], type: "text" },
    { label: "Student Name", value: r["studentName"], type: "text" },
    { label: "Batch", value: r["batch"], type: "relation" },
    { label: "Course", value: r["course"], type: "text" },
    { label: "Enrollment Date", value: r["enrollmentDate"], type: "date" },
    { label: "Fee Amount", value: r["feeAmount"], type: "currency" },
    { label: "Fee Status", value: r["feeStatus"], type: "select", chipVariant: STATUS_VARIANT[String(r["feeStatus"])] ?? "neutral" },
    { label: "Attendance (%)", value: r["attendancePercent"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getEducationTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Student enrolled by admissions counsellor Divya S. — IP 103.21.44.16", timestamp: "2026-06-10T11:00:00", actor: "Divya S." },
    { id: "t2", label: "First fee installment collected by Divya S. — IP 103.21.44.16", timestamp: "2026-06-10T11:15:00", actor: "Divya S." },
    { id: "t3", label: "Attendance percentage recalculated after latest batch session", timestamp: "2026-08-06T18:00:00", actor: "System" },
    { id: "t4", label: "Enrollment status reviewed at term checkpoint", timestamp: "2026-08-07T09:30:00", actor: "Academic Coordinator" },
  ];
}

export const educationRelated: RelatedRecord[] = [];
