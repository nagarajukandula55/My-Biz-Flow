import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Shipment sample data for the logistics-fleet module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Dispatched": "neutral",
  "In transit": "teal",
  "Delayed": "danger",
  "Delivered": "success",
  "Returned": "warning"
};

export const logisticsFleetColumns: Column[] = [
  { key: "id", label: "Shipment ID", type: "text" },
  { key: "driver", label: "Driver", type: "text" },
  { key: "vehicleNumber", label: "Vehicle Number", type: "text" },
  { key: "origin", label: "Origin", type: "text" },
  { key: "destination", label: "Destination", type: "text" },
  { key: "currentLatitude", label: "Current Latitude", type: "text" },
  { key: "currentLongitude", label: "Current Longitude", type: "text" },
  { key: "deliveryEta", label: "Delivery ETA", type: "date" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const logisticsFleetRows: Row[] = [
  {
    id: "SHP-5501",
    driver: "Manjunath T.",
    vehicleNumber: "KA-05-AB-4471",
    origin: "Bengaluru Warehouse",
    destination: "Chennai DC",
    currentLatitude: 12.6,
    currentLongitude: 78.15,
    deliveryEta: "2026-08-08",
    status: "In transit",
  },
  {
    id: "SHP-5500",
    driver: "Balwinder S.",
    vehicleNumber: "PB-10-CD-7723",
    origin: "Ludhiana Hub",
    destination: "Delhi NCR DC",
    currentLatitude: 30.901,
    currentLongitude: 75.8573,
    deliveryEta: "2026-08-07",
    status: "Delayed",
  },
  {
    id: "SHP-5499",
    driver: "Ramesh V.",
    vehicleNumber: "MH-12-EF-9021",
    origin: "Pune Warehouse",
    destination: "Mumbai DC",
    currentLatitude: 19.076,
    currentLongitude: 72.8777,
    deliveryEta: "2026-08-06",
    status: "Delivered",
  },
  {
    id: "SHP-5498",
    driver: "Manjunath T.",
    vehicleNumber: "KA-05-AB-4471",
    origin: "Chennai DC",
    destination: "Bengaluru Warehouse",
    currentLatitude: 12.9716,
    currentLongitude: 77.5946,
    deliveryEta: "2026-08-09",
    status: "Dispatched",
  },
];

export const logisticsFleetFormFields: FormFieldDef[] = [
  { key: "id", label: "Shipment ID", type: "text", required: true },
  { key: "driver", label: "Driver", type: "text", required: true },
  { key: "vehicleNumber", label: "Vehicle Number", type: "text", required: true },
  { key: "origin", label: "Origin", type: "text", required: true },
  { key: "destination", label: "Destination", type: "text", required: true },
  { key: "currentLatitude", label: "Current Latitude", type: "number", required: false },
  { key: "currentLongitude", label: "Current Longitude", type: "number", required: false },
  { key: "deliveryEta", label: "Delivery ETA", type: "date", required: false },
  { key: "status", label: "Status", type: "select", required: true, options: ["Dispatched","In transit","Delayed","Delivered","Returned"] },
];

export function getLogisticsFleetRecord(recordId: string): Row {
  return logisticsFleetRows.find((r) => String(r["id"]) === recordId) ?? logisticsFleetRows[0];
}

export function getLogisticsFleetDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Shipment ID", value: r["id"], type: "text" },
    { label: "Driver", value: r["driver"], type: "text" },
    { label: "Vehicle Number", value: r["vehicleNumber"], type: "text" },
    { label: "Origin", value: r["origin"], type: "text" },
    { label: "Destination", value: r["destination"], type: "text" },
    { label: "Current Latitude", value: r["currentLatitude"], type: "text" },
    { label: "Current Longitude", value: r["currentLongitude"], type: "text" },
    { label: "Delivery ETA", value: r["deliveryEta"], type: "date" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getLogisticsFleetTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["deliveryEta"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const logisticsFleetRelated: RelatedRecord[] = [];
