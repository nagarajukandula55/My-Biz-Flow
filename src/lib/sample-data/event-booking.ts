import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Event sample data for the event-booking module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Inquiry": "neutral",
  "Confirmed": "teal",
  "In progress": "warning",
  "Completed": "success",
  "Cancelled": "danger"
};

export const eventBookingColumns: Column[] = [
  { key: "id", label: "Event ID", type: "text" },
  { key: "eventName", label: "Event Name", type: "text" },
  { key: "venue", label: "Venue", type: "text" },
  { key: "latitude", label: "Latitude", type: "text" },
  { key: "longitude", label: "Longitude", type: "text" },
  { key: "eventDate", label: "Event Date", type: "date" },
  { key: "capacity", label: "Capacity", type: "text" },
  { key: "organizer", label: "Organizer", type: "relation-link" },
  { key: "cateringIncluded", label: "Catering Included", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const eventBookingRows: Row[] = [
  {
    id: "EVT-3101",
    eventName: "Sharma-Reddy Wedding Reception",
    venue: "Emerald Banquet Hall",
    latitude: 12.935,
    longitude: 77.6115,
    eventDate: "2026-09-14",
    capacity: 400,
    organizer: "Aria Events",
    cateringIncluded: true,
    status: "Confirmed",
  },
  {
    id: "EVT-3100",
    eventName: "TechCon 2026 Bengaluru",
    venue: "Palace Grounds Convention Centre",
    latitude: 12.9989,
    longitude: 77.5926,
    eventDate: "2026-10-02",
    capacity: 1200,
    organizer: "TechCon Media",
    cateringIncluded: false,
    status: "Inquiry",
  },
  {
    id: "EVT-3099",
    eventName: "Infosys Annual Day",
    venue: "Chinnaswamy Club Grounds",
    latitude: 12.9789,
    longitude: 77.5993,
    eventDate: "2026-08-06",
    capacity: 600,
    organizer: "Infosys Facilities",
    cateringIncluded: true,
    status: "Completed",
  },
  {
    id: "EVT-3098",
    eventName: "Kumar 50th Birthday",
    venue: "Lotus Garden Resort",
    latitude: 12.8452,
    longitude: 77.6602,
    eventDate: "2026-08-20",
    capacity: 150,
    organizer: "Aria Events",
    cateringIncluded: true,
    status: "In progress",
  },
];

export const eventBookingFormFields: FormFieldDef[] = [
  { key: "id", label: "Event ID", type: "text", required: true },
  { key: "eventName", label: "Event Name", type: "text", required: true },
  { key: "venue", label: "Venue", type: "text", required: true },
  { key: "latitude", label: "Latitude", type: "number", required: false },
  { key: "longitude", label: "Longitude", type: "number", required: false },
  { key: "eventDate", label: "Event Date", type: "date", required: true },
  { key: "capacity", label: "Capacity", type: "number", required: true },
  { key: "organizer", label: "Organizer", type: "relation", required: true },
  { key: "cateringIncluded", label: "Catering Included", type: "boolean", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Inquiry","Confirmed","In progress","Completed","Cancelled"] },
];

export function getEventBookingRecord(recordId: string): Row {
  return eventBookingRows.find((r) => String(r["id"]) === recordId) ?? eventBookingRows[0];
}

export function getEventBookingDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Event ID", value: r["id"], type: "text" },
    { label: "Event Name", value: r["eventName"], type: "text" },
    { label: "Venue", value: r["venue"], type: "text" },
    { label: "Latitude", value: r["latitude"], type: "text" },
    { label: "Longitude", value: r["longitude"], type: "text" },
    { label: "Event Date", value: r["eventDate"], type: "date" },
    { label: "Capacity", value: r["capacity"], type: "text" },
    { label: "Organizer", value: r["organizer"], type: "relation" },
    { label: "Catering Included", value: r["cateringIncluded"], type: "boolean" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getEventBookingTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Booking inquiry logged by organizer via portal — IP 103.21.44.28", timestamp: "2026-07-18T13:00:00", actor: "Organizer" },
    { id: "t2", label: "Booking confirmed and venue location pinned (12.935, 77.6115) by Karthik N. — IP 103.21.44.25", timestamp: "2026-07-20T10:30:00", actor: "Karthik N." },
    { id: "t3", label: "Catering add-on confirmed with organizer", timestamp: "2026-08-01T15:00:00", actor: "Events Team" },
    { id: "t4", label: "Event status updated after on-ground execution review", timestamp: "2026-08-06T20:00:00", actor: "Events Team" },
  ];
}

export const eventBookingRelated: RelatedRecord[] = [];
