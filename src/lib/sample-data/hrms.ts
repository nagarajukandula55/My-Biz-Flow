import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Employee sample data for the hrms module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Present": "success",
  "Absent": "danger",
  "On leave": "warning",
  "Half day": "amber"
};

export const hrmsColumns: Column[] = [
  { key: "id", label: "Employee ID", type: "text" },
  { key: "employeeName", label: "Name", type: "text" },
  { key: "role", label: "Role", type: "text" },
  { key: "shift", label: "Shift", type: "select-chip" },
  { key: "checkInTime", label: "Check-in Time", type: "date" },
  { key: "checkInLatitude", label: "Check-in Latitude", type: "text" },
  { key: "checkInLongitude", label: "Check-in Longitude", type: "text" },
  { key: "checkInIp", label: "Check-in IP Address", type: "text" },
  { key: "checkOutTime", label: "Check-out Time", type: "date" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const hrmsRows: Row[] = [
  {
    id: "EMP-0231",
    employeeName: "Nikhil Bansal",
    role: "Store Manager",
    shift: "General",
    checkInTime: "2026-08-07T09:02:00",
    checkInLatitude: 12.9352,
    checkInLongitude: 77.6146,
    checkInIp: "103.21.44.10",
    checkOutTime: null,
    status: "Present",
  },
  {
    id: "EMP-0230",
    employeeName: "Sarita Yadav",
    role: "Cashier",
    shift: "Morning",
    checkInTime: "2026-08-07T08:00:00",
    checkInLatitude: 12.9352,
    checkInLongitude: 77.6146,
    checkInIp: "103.21.44.11",
    checkOutTime: "2026-08-07T16:00:00",
    status: "Present",
  },
  {
    id: "EMP-0229",
    employeeName: "Tejas Deshmukh",
    role: "Technician",
    shift: "Evening",
    checkInTime: null,
    checkInLatitude: null,
    checkInLongitude: null,
    checkInIp: null,
    checkOutTime: null,
    status: "On leave",
  },
  {
    id: "EMP-0228",
    employeeName: "Aisha Fatima",
    role: "Front Desk",
    shift: "Morning",
    checkInTime: "2026-08-07T09:40:00",
    checkInLatitude: 12.971,
    checkInLongitude: 77.6412,
    checkInIp: "103.21.44.30",
    checkOutTime: null,
    status: "Half day",
  },
];

export const hrmsFormFields: FormFieldDef[] = [
  { key: "id", label: "Employee ID", type: "text", required: true },
  { key: "employeeName", label: "Name", type: "text", required: true },
  { key: "role", label: "Role", type: "text", required: true },
  { key: "shift", label: "Shift", type: "select", required: false, options: ["Morning","Evening","Night","General"] },
  { key: "checkInTime", label: "Check-in Time", type: "date", required: false },
  { key: "checkInLatitude", label: "Check-in Latitude", type: "number", required: false },
  { key: "checkInLongitude", label: "Check-in Longitude", type: "number", required: false },
  { key: "checkInIp", label: "Check-in IP Address", type: "text", required: false },
  { key: "checkOutTime", label: "Check-out Time", type: "date", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Present","Absent","On leave","Half day"] },
];

export function getHrmsRecord(recordId: string): Row {
  return hrmsRows.find((r) => String(r["id"]) === recordId) ?? hrmsRows[0];
}

export function getHrmsDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Employee ID", value: r["id"], type: "text" },
    { label: "Name", value: r["employeeName"], type: "text" },
    { label: "Role", value: r["role"], type: "text" },
    { label: "Shift", value: r["shift"], type: "select", chipVariant: STATUS_VARIANT[String(r["shift"])] ?? "neutral" },
    { label: "Check-in Time", value: r["checkInTime"], type: "date" },
    { label: "Check-in Latitude", value: r["checkInLatitude"], type: "text" },
    { label: "Check-in Longitude", value: r["checkInLongitude"], type: "text" },
    { label: "Check-in IP Address", value: r["checkInIp"], type: "text" },
    { label: "Check-out Time", value: r["checkOutTime"], type: "date" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getHrmsTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Employee checked in for shift (12.9352, 77.6146) — IP 103.21.44.10", timestamp: "2026-08-07T09:00:00", actor: "Employee" },
    { id: "t2", label: "Shift assignment confirmed by HR — IP 103.21.44.11", timestamp: "2026-08-07T09:02:00", actor: "HR Admin" },
    { id: "t3", label: "Attendance status marked Present after check-in validation", timestamp: "2026-08-07T09:03:00", actor: "System" },
    { id: "t4", label: "Employee checked out at end of shift", timestamp: "2026-08-07T18:10:00", actor: "Employee" },
  ];
}

export const hrmsRelated: RelatedRecord[] = [];
