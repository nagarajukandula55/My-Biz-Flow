import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Shipment sample data for the logistics-fleet module. Delivery lifecycle is
// a real stage machine (Pending -> Out for Delivery -> Delivered/Failed),
// each transition stamped server-side — see DeliveryLifecycle.tsx + actions.ts.

export const DELIVERY_STAGES = ["Pending", "Out for Delivery", "Delivered"] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number] | "Failed";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Pending": "neutral",
  "Out for Delivery": "teal",
  "Delivered": "success",
  "Failed": "danger",
};

export const logisticsFleetColumns: Column[] = [
  { key: "id", label: "Shipment ID", type: "text" },
  { key: "driverName", label: "Driver", type: "text" },
  { key: "vehicleNumber", label: "Vehicle Number", type: "text" },
  { key: "origin", label: "Origin", type: "text" },
  { key: "destination", label: "Destination", type: "text" },
  { key: "deliveryEta", label: "Delivery ETA", type: "date" },
  { key: "deliveryStage", label: "Delivery Stage", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export const logisticsFleetRows: Row[] = [
  {
    id: "SHP-5501",
    driverId: "USR-MANJUNATH",
    driverName: "Manjunath T.",
    vehicleNumber: "KA-05-AB-4471",
    origin: "Bengaluru Warehouse",
    destination: "Chennai DC",
    currentLatitude: 12.6,
    currentLongitude: 78.15,
    deliveryEta: "2026-09-08",
    deliveryStage: "Out for Delivery",
    pendingAt: "2026-09-05T08:00:00",
    outForDeliveryAt: "2026-09-05T09:30:00",
  },
  {
    id: "SHP-5500",
    driverId: "USR-BALWINDER",
    driverName: "Balwinder S.",
    vehicleNumber: "PB-10-CD-7723",
    origin: "Ludhiana Hub",
    destination: "Delhi NCR DC",
    currentLatitude: 30.901,
    currentLongitude: 75.8573,
    deliveryEta: "2026-09-04",
    deliveryStage: "Failed",
    pendingAt: "2026-09-02T08:00:00",
    outForDeliveryAt: "2026-09-03T10:00:00",
    failedAt: "2026-09-04T17:00:00",
    failureReason: "Recipient unavailable at address",
  },
  {
    id: "SHP-5499",
    driverId: "USR-RAMESH-V",
    driverName: "Ramesh V.",
    vehicleNumber: "MH-12-EF-9021",
    origin: "Pune Warehouse",
    destination: "Mumbai DC",
    currentLatitude: 19.076,
    currentLongitude: 72.8777,
    deliveryEta: "2026-08-06",
    deliveryStage: "Delivered",
    pendingAt: "2026-08-05T08:00:00",
    outForDeliveryAt: "2026-08-06T09:00:00",
    deliveredAt: "2026-08-06T14:20:00",
    recipientName: "Anita Deshmukh",
    deliveryNotes: "Left at reception, signed for by security desk.",
  },
  {
    id: "SHP-5498",
    driverId: undefined,
    driverName: undefined,
    vehicleNumber: "KA-05-AB-4471",
    origin: "Chennai DC",
    destination: "Bengaluru Warehouse",
    currentLatitude: 12.9716,
    currentLongitude: 77.5946,
    deliveryEta: "2026-09-09",
    deliveryStage: "Pending",
    pendingAt: "2026-09-05T07:00:00",
  },
];

export const logisticsFleetFormFields: FormFieldDef[] = [
  { key: "id", label: "Shipment ID", type: "text", required: true },
  { key: "vehicleNumber", label: "Vehicle Number", type: "text", required: true },
  { key: "origin", label: "Origin", type: "text", required: true },
  { key: "destination", label: "Destination", type: "text", required: true },
  { key: "currentLatitude", label: "Current Latitude", type: "number", required: false },
  { key: "currentLongitude", label: "Current Longitude", type: "number", required: false },
  { key: "deliveryEta", label: "Delivery ETA", type: "date", required: false },
];

export function getLogisticsFleetRecord(recordId: string): Row {
  return logisticsFleetRows.find((r) => String(r["id"]) === recordId) ?? logisticsFleetRows[0];
}

export function getLogisticsFleetDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Shipment ID", value: r["id"], type: "text" },
    { label: "Driver", value: r["driverName"], type: "text" },
    { label: "Vehicle Number", value: r["vehicleNumber"], type: "text" },
    { label: "Origin", value: r["origin"], type: "text" },
    { label: "Destination", value: r["destination"], type: "text" },
    { label: "Current Latitude", value: r["currentLatitude"], type: "text" },
    { label: "Current Longitude", value: r["currentLongitude"], type: "text" },
    { label: "Delivery ETA", value: r["deliveryEta"], type: "date" },
    {
      label: "Delivery Stage",
      value: r["deliveryStage"] ?? "Pending",
      type: "select",
      chipVariant: STATUS_VARIANT[String(r["deliveryStage"] ?? "Pending")] ?? "neutral",
    },
  ];
}

export function getLogisticsFleetTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Shipment dispatched from origin hub by Dispatch Team — IP 103.21.44.31", timestamp: "2026-08-05T08:00:00", actor: "Dispatch Team" },
    { id: "t2", label: "Driver logged in and vehicle assigned — IP 103.21.44.31", timestamp: "2026-08-05T08:05:00", actor: "Dispatch Team" },
    { id: "t3", label: "Live location ping received en route (12.9716, 77.5946)", timestamp: "2026-08-06T14:20:00", actor: "Fleet Tracking" },
    { id: "t4", label: "Delivery status updated against ETA", timestamp: "2026-08-06T19:00:00", actor: "System" },
  ];
}

export const logisticsFleetRelated: RelatedRecord[] = [];

/** Normalized view of a shipment's delivery-lifecycle-relevant fields, read off the raw record. */
export type LogisticsLifecycle = {
  deliveryStage: DeliveryStage;
  driverId?: string;
  driverName?: string;
  vehicleNumber?: string;
  assignedAt?: string;
  pendingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  recipientName?: string;
  deliveryNotes?: string;
};

export function extractLogisticsLifecycleFromRecord(record: Row): LogisticsLifecycle {
  return {
    deliveryStage: (record["deliveryStage"] as DeliveryStage) ?? "Pending",
    driverId: record["driverId"] ? String(record["driverId"]) : undefined,
    driverName: record["driverName"] ? String(record["driverName"]) : undefined,
    vehicleNumber: record["vehicleNumber"] ? String(record["vehicleNumber"]) : undefined,
    assignedAt: record["assignedAt"] ? String(record["assignedAt"]) : undefined,
    pendingAt: record["pendingAt"] ? String(record["pendingAt"]) : undefined,
    outForDeliveryAt: record["outForDeliveryAt"] ? String(record["outForDeliveryAt"]) : undefined,
    deliveredAt: record["deliveredAt"] ? String(record["deliveredAt"]) : undefined,
    failedAt: record["failedAt"] ? String(record["failedAt"]) : undefined,
    failureReason: record["failureReason"] ? String(record["failureReason"]) : undefined,
    recipientName: record["recipientName"] ? String(record["recipientName"]) : undefined,
    deliveryNotes: record["deliveryNotes"] ? String(record["deliveryNotes"]) : undefined,
  };
}
