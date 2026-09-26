import type { Column, Row } from "@/components/DataTable";
import type { RecordField } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import type { StatusVariant } from "@/components/StatusChip";
import { paiseToRupees, type PropertyRow } from "@/lib/realEstateData";

// Field vocabulary for the Real Estate "Properties" sub-page (Property,
// Prisma-backed — see src/lib/realEstateData.ts). Money fields render in
// rupees; the underlying column is paise.

const LISTING_STATUS_VARIANT: Record<string, StatusVariant> = {
  Available: "success",
  "Under Offer": "warning",
  Sold: "danger",
  Rented: "teal",
};

export const propertyColumns: Column[] = [
  { key: "id", label: "Property ID", type: "text" },
  { key: "propertyType", label: "Property Type", type: "select-chip" },
  { key: "address", label: "Address", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "areaSqft", label: "Area (sqft)", type: "text" },
  { key: "bedrooms", label: "Bedrooms", type: "text" },
  { key: "listingStatus", label: "Listing Status", type: "select-chip", chipVariantMap: LISTING_STATUS_VARIANT },
  { key: "agentName", label: "Agent", type: "text" },
  { key: "siteVisitDate", label: "Next Site Visit", type: "date" },
];

export const propertyFormFields: FormFieldDef[] = [
  { key: "propertyType", label: "Property Type", type: "select", required: true, options: ["Apartment", "Villa", "Plot", "Commercial"] },
  { key: "address", label: "Address", type: "textarea", required: true },
  { key: "latitude", label: "Latitude", type: "number", required: false },
  { key: "longitude", label: "Longitude", type: "number", required: false },
  { key: "price", label: "Price (₹)", type: "currency", required: true },
  { key: "areaSqft", label: "Area (sqft)", type: "number", required: false },
  { key: "bedrooms", label: "Bedrooms", type: "number", required: false },
  { key: "listingStatus", label: "Listing Status", type: "select", required: true, options: ["Available", "Under Offer", "Sold", "Rented"] },
  { key: "agentName", label: "Agent", type: "text", required: false },
  { key: "siteVisitDate", label: "Next Site Visit", type: "date", required: false },
];

export function propertyToRow(p: PropertyRow): Row {
  return {
    id: p.id,
    propertyType: p.propertyType,
    address: p.address,
    latitude: p.latitude ?? "",
    longitude: p.longitude ?? "",
    price: paiseToRupees(p.price),
    areaSqft: p.areaSqft ?? "",
    bedrooms: p.bedrooms ?? "",
    listingStatus: p.listingStatus,
    agentName: p.agentName ?? "",
    siteVisitDate: p.siteVisitDate ? p.siteVisitDate.toISOString() : "",
  };
}

export function getPropertyDetailFields(row: Row): RecordField[] {
  return [
    { label: "Property ID", value: row["id"], type: "text" },
    { label: "Property Type", value: row["propertyType"], type: "text" },
    { label: "Address", value: row["address"], type: "text" },
    { label: "Latitude", value: row["latitude"], type: "text" },
    { label: "Longitude", value: row["longitude"], type: "text" },
    { label: "Price", value: row["price"], type: "currency" },
    { label: "Area (sqft)", value: row["areaSqft"], type: "text" },
    { label: "Bedrooms", value: row["bedrooms"], type: "text" },
    { label: "Listing Status", value: row["listingStatus"], type: "select", chipVariant: LISTING_STATUS_VARIANT[String(row["listingStatus"])] ?? "neutral" },
    { label: "Agent", value: row["agentName"], type: "text" },
    { label: "Next Site Visit", value: row["siteVisitDate"], type: "date" },
  ];
}
