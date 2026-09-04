import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Enrollment sample data for the education module — realistic field modeling.
// Fee/attendance/batch-capacity domain logic lives in
// src/app/partner/[partnerId]/education/[recordId]/actions.ts and is
// persisted onto the real BusinessRecord (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Active": "success",
  "Completed": "teal",
  "Dropped": "danger"
};

const FEE_STATUS_VARIANT: Record<string, StatusVariant> = {
  "Paid": "success",
  "Partially Paid": "warning",
  "Pending": "danger",
};

/** One attendance session for a student, appended by the Mark Attendance action. */
export interface AttendanceEntry {
  date: string; // ISO date
  present: boolean;
}

/** Percentage of logged sessions marked present, rounded to the nearest whole number. 0 sessions => 0. */
export function computeAttendancePercent(log: AttendanceEntry[]): number {
  if (!log || log.length === 0) return 0;
  const present = log.filter((e) => e.present).length;
  return Math.round((present / log.length) * 100);
}

export const educationColumns: Column[] = [
  { key: "id", label: "Student ID", type: "text" },
  { key: "studentName", label: "Student Name", type: "text" },
  { key: "batch", label: "Batch", type: "relation-link" },
  { key: "course", label: "Course", type: "text" },
  { key: "enrollmentDate", label: "Enrollment Date", type: "date" },
  { key: "feeAmount", label: "Fee Amount", type: "currency" },
  { key: "feeDueDate", label: "Fee Due Date", type: "date" },
  { key: "feeStatus", label: "Fee Status", type: "select-chip", chipVariantMap: FEE_STATUS_VARIANT },
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
    feeDueDate: "2026-09-10",
    feeStatus: "Paid",
    attendanceLog: [
      { date: "2026-08-01", present: true },
      { date: "2026-08-02", present: true },
      { date: "2026-08-03", present: false },
    ],
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
    feeDueDate: "2026-09-15",
    feeStatus: "Partially Paid",
    attendanceLog: [
      { date: "2026-08-01", present: true },
      { date: "2026-08-02", present: false },
    ],
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
    feeDueDate: "2026-01-05",
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
    feeDueDate: "2026-06-20",
    feeStatus: "Paid",
    attendancePercent: 88,
    status: "Completed",
  },
];

export const educationFormFields: FormFieldDef[] = [
  { key: "id", label: "Student ID", type: "text", required: true },
  { key: "studentName", label: "Student Name", type: "text", required: true },
  { key: "batch", label: "Batch", type: "relation", required: true, placeholder: "Batch ID from Batches list" },
  { key: "course", label: "Course", type: "text", required: true },
  { key: "enrollmentDate", label: "Enrollment Date", type: "date", required: true },
  { key: "feeAmount", label: "Fee Amount", type: "currency", required: true },
  { key: "feeDueDate", label: "Fee Due Date", type: "date", required: false },
  { key: "feeStatus", label: "Fee Status", type: "select", required: false, options: ["Paid","Partially Paid","Pending"] },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Completed","Dropped"] },
];

export function getEducationRecord(recordId: string): Row {
  return educationRows.find((r) => String(r["id"]) === recordId) ?? educationRows[0];
}

export function getEducationDetailFields(record: Row): RecordField[] {
  const r = record;
  const log = (r["attendanceLog"] as AttendanceEntry[] | undefined) ?? [];
  const attendancePercent = log.length > 0 ? computeAttendancePercent(log) : r["attendancePercent"];
  return [
    { label: "Student ID", value: r["id"], type: "text" },
    { label: "Student Name", value: r["studentName"], type: "text" },
    { label: "Batch", value: r["batch"], type: "relation" },
    { label: "Course", value: r["course"], type: "text" },
    { label: "Enrollment Date", value: r["enrollmentDate"], type: "date" },
    { label: "Fee Amount", value: r["feeAmount"], type: "currency" },
    { label: "Fee Due Date", value: r["feeDueDate"], type: "date" },
    { label: "Fee Status", value: r["feeStatus"], type: "select", chipVariant: FEE_STATUS_VARIANT[String(r["feeStatus"])] ?? "neutral" },
    { label: "Attendance (%)", value: attendancePercent, type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getEducationTimeline(record: Row): TimelineEntry[] {
  const log = (record["attendanceLog"] as AttendanceEntry[] | undefined) ?? [];
  const attendanceEntries: TimelineEntry[] = log
    .slice(-5)
    .map((e, i) => ({
      id: `att-${i}-${e.date}`,
      label: `Attendance marked ${e.present ? "present" : "absent"} for ${e.date}`,
      timestamp: `${e.date}T09:00:00`,
      actor: "Attendance Register",
    }));
  return [
    { id: "t1", label: "Student enrolled by admissions counsellor Divya S. — IP 103.21.44.16", timestamp: "2026-06-10T11:00:00", actor: "Divya S." },
    { id: "t2", label: "First fee installment collected by Divya S. — IP 103.21.44.16", timestamp: "2026-06-10T11:15:00", actor: "Divya S." },
    ...attendanceEntries,
    { id: "t4", label: "Enrollment status reviewed at term checkpoint", timestamp: "2026-08-07T09:30:00", actor: "Academic Coordinator" },
  ];
}

export const educationRelated: RelatedRecord[] = [];

// --- Batches (capacity-checked sub-list, mirrors service-centre's
// brands/models sub-page pattern) — a batch is a real BusinessRecord under
// moduleSlug "education-batches", with its own maxSeats. Enrollment into a
// full batch is blocked server-side in education/[recordId]/actions.ts /
// education/actions.ts, not just hidden in the UI. ---

export const educationBatchColumns: Column[] = [
  { key: "id", label: "Batch ID", type: "text" },
  { key: "batchName", label: "Batch Name", type: "text" },
  { key: "course", label: "Course", type: "text" },
  { key: "maxSeats", label: "Max Seats", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const educationBatchFormFields: FormFieldDef[] = [
  { key: "id", label: "Batch ID", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "batchName", label: "Batch Name", type: "text", required: true },
  { key: "course", label: "Course", type: "text", required: false },
  { key: "maxSeats", label: "Max Seats", type: "number", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];
