import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Booking sample data for the rentals module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Requested": "warning",
  "Confirmed": "teal",
  "Ongoing": "amber",
  "Completed": "success",
  "Cancelled": "danger"
};

export const rentalsColumns: Column[] = [
  { key: "id", label: "Booking ID", type: "text" },
  { key: "assetName", label: "Asset / Venue Name", type: "text" },
  { key: "renter", label: "Renter", type: "relation-link" },
  { key: "bookingStart", label: "Booking Start", type: "date" },
  { key: "bookingEnd", label: "Booking End", type: "date" },
  { key: "depositAmount", label: "Deposit Amount", type: "currency" },
  { key: "rentalAmount", label: "Rental Amount", type: "currency" },
  { key: "latitude", label: "Latitude", type: "text" },
  { key: "longitude", label: "Longitude", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const rentalsRows: Row[] = [
  {
    id: "BK-7701",
    assetName: "Canon R5 Camera Kit",
    renter: "Studio Lumen",
    bookingStart: "2026-08-09",
    bookingEnd: "2026-08-11",
    depositAmount: 5000,
    rentalAmount: 4500,
    latitude: 12.9784,
    longitude: 77.6408,
    status: "Confirmed",
  },
  {
    id: "BK-7700",
    assetName: "Emerald Banquet Hall",
    renter: "Reddy Family",
    bookingStart: "2026-09-14",
    bookingEnd: "2026-09-14",
    depositAmount: 25000,
    rentalAmount: 120000,
    latitude: 12.935,
    longitude: 77.6115,
    status: "Requested",
  },
  {
    id: "BK-7699",
    assetName: "JCB Excavator",
    renter: "Konark Builders",
    bookingStart: "2026-08-01",
    bookingEnd: "2026-08-05",
    depositAmount: 15000,
    rentalAmount: 40000,
    latitude: 12.8452,
    longitude: 77.6602,
    status: "Ongoing",
  },
  {
    id: "BK-7698",
    assetName: "Sound System — Full PA",
    renter: "Aria Events",
    bookingStart: "2026-07-20",
    bookingEnd: "2026-07-21",
    depositAmount: 3000,
    rentalAmount: 8000,
    latitude: 12.9611,
    longitude: 77.6387,
    status: "Completed",
  },
];

export const rentalsFormFields: FormFieldDef[] = [
  { key: "id", label: "Booking ID", type: "text", required: true },
  { key: "assetName", label: "Asset / Venue Name", type: "text", required: true },
  { key: "renter", label: "Renter", type: "relation", required: true },
  { key: "bookingStart", label: "Booking Start", type: "date", required: true },
  { key: "bookingEnd", label: "Booking End", type: "date", required: true },
  { key: "depositAmount", label: "Deposit Amount", type: "currency", required: false },
  { key: "rentalAmount", label: "Rental Amount", type: "currency", required: true },
  { key: "latitude", label: "Latitude", type: "number", required: false },
  { key: "longitude", label: "Longitude", type: "number", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Requested","Confirmed","Ongoing","Completed","Cancelled"] },
];

export function getRentalsRecord(recordId: string): Row {
  return rentalsRows.find((r) => String(r["id"]) === recordId) ?? rentalsRows[0];
}

export function getRentalsDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Booking ID", value: r["id"], type: "text" },
    { label: "Asset / Venue Name", value: r["assetName"], type: "text" },
    { label: "Renter", value: r["renter"], type: "relation" },
    { label: "Booking Start", value: r["bookingStart"], type: "date" },
    { label: "Booking End", value: r["bookingEnd"], type: "date" },
    { label: "Deposit Amount", value: r["depositAmount"], type: "currency" },
    { label: "Rental Amount", value: r["rentalAmount"], type: "currency" },
    { label: "Latitude", value: r["latitude"], type: "text" },
    { label: "Longitude", value: r["longitude"], type: "text" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getRentalsTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Booking requested by renter via portal — IP 103.21.44.26", timestamp: "2026-07-29T12:00:00", actor: "Renter" },
    { id: "t2", label: "Booking confirmed and deposit collected by Rentals Desk — IP 103.21.44.26", timestamp: "2026-07-29T12:30:00", actor: "Rentals Desk" },
    { id: "t3", label: "Asset handed over to renter at pickup location", timestamp: "2026-08-01T09:00:00", actor: "Rentals Desk" },
    { id: "t4", label: "Booking status updated on return of asset", timestamp: "2026-08-06T18:00:00", actor: "Rentals Desk" },
  ];
}

export const rentalsRelated: RelatedRecord[] = [];
