import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Listing sample data for the real-estate module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Available": "success",
  "Under Offer": "warning",
  "Sold": "danger",
  "Rented": "teal"
};

export const realEstateColumns: Column[] = [
  { key: "id", label: "Listing ID", type: "text" },
  { key: "propertyType", label: "Property Type", type: "select-chip" },
  { key: "address", label: "Address", type: "text" },
  { key: "latitude", label: "Latitude", type: "text" },
  { key: "longitude", label: "Longitude", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "areaSqft", label: "Area (sqft)", type: "text" },
  { key: "bedrooms", label: "Bedrooms", type: "text" },
  { key: "listingStatus", label: "Listing Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "agent", label: "Agent", type: "relation-link" },
  { key: "siteVisitDate", label: "Next Site Visit", type: "date" },
];

export const realEstateRows: Row[] = [
  {
    id: "LST-2211",
    propertyType: "Apartment",
    address: "3BHK, Prestige Falcon City, Kanakapura Rd",
    latitude: 12.9081,
    longitude: 77.5498,
    price: 9800000,
    areaSqft: 1450,
    bedrooms: 3,
    listingStatus: "Available",
    agent: "Deepika Shetty",
    siteVisitDate: "2026-08-10",
  },
  {
    id: "LST-2210",
    propertyType: "Villa",
    address: "Independent Villa, Whitefield",
    latitude: 12.9698,
    longitude: 77.75,
    price: 24500000,
    areaSqft: 3200,
    bedrooms: 4,
    listingStatus: "Under Offer",
    agent: "Naveen Rao",
    siteVisitDate: "2026-08-09",
  },
  {
    id: "LST-2209",
    propertyType: "Plot",
    address: "40x60 Site, Sarjapur Road",
    latitude: 12.8991,
    longitude: 77.6862,
    price: 6200000,
    areaSqft: 2400,
    bedrooms: null,
    listingStatus: "Sold",
    agent: "Deepika Shetty",
    siteVisitDate: null,
  },
  {
    id: "LST-2208",
    propertyType: "Commercial",
    address: "Retail Unit, Brigade Road",
    latitude: 12.9716,
    longitude: 77.6084,
    price: 45000,
    areaSqft: 800,
    bedrooms: null,
    listingStatus: "Rented",
    agent: "Naveen Rao",
    siteVisitDate: null,
  },
];

export const realEstateFormFields: FormFieldDef[] = [
  { key: "id", label: "Listing ID", type: "text", required: true },
  { key: "propertyType", label: "Property Type", type: "select", required: true, options: ["Apartment","Villa","Plot","Commercial"] },
  { key: "address", label: "Address", type: "textarea", required: true },
  { key: "latitude", label: "Latitude", type: "number", required: true },
  { key: "longitude", label: "Longitude", type: "number", required: true },
  { key: "price", label: "Price", type: "currency", required: true },
  { key: "areaSqft", label: "Area (sqft)", type: "number", required: true },
  { key: "bedrooms", label: "Bedrooms", type: "number", required: false },
  { key: "listingStatus", label: "Listing Status", type: "select", required: true, options: ["Available","Under Offer","Sold","Rented"] },
  { key: "agent", label: "Agent", type: "relation", required: true },
  { key: "siteVisitDate", label: "Next Site Visit", type: "date", required: false },
];

export function getRealEstateRecord(recordId: string): Row {
  return realEstateRows.find((r) => String(r["id"]) === recordId) ?? realEstateRows[0];
}

export function getRealEstateDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Listing ID", value: r["id"], type: "text" },
    { label: "Property Type", value: r["propertyType"], type: "select", chipVariant: STATUS_VARIANT[String(r["propertyType"])] ?? "neutral" },
    { label: "Address", value: r["address"], type: "text" },
    { label: "Latitude", value: r["latitude"], type: "text" },
    { label: "Longitude", value: r["longitude"], type: "text" },
    { label: "Price", value: r["price"], type: "currency" },
    { label: "Area (sqft)", value: r["areaSqft"], type: "text" },
    { label: "Bedrooms", value: r["bedrooms"], type: "text" },
    { label: "Listing Status", value: r["listingStatus"], type: "select", chipVariant: STATUS_VARIANT[String(r["listingStatus"])] ?? "neutral" },
    { label: "Agent", value: r["agent"], type: "relation" },
    { label: "Next Site Visit", value: r["siteVisitDate"], type: "date" },
  ];
}

export function getRealEstateTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Listing created and address geo-pinned (12.9716, 77.6084) by Agent — IP 103.21.44.29", timestamp: "2026-06-01T11:00:00", actor: "Agent" },
    { id: "t2", label: "Price updated after market comparison review", timestamp: "2026-07-10T09:00:00", actor: "Agent" },
    { id: "t3", label: "Site visit scheduled with prospective buyer", timestamp: "2026-08-03T14:00:00", actor: "Agent" },
    { id: "t4", label: "Listing status updated after site visit feedback", timestamp: "2026-08-06T17:00:00", actor: "Agent" },
  ];
}

export const realEstateRelated: RelatedRecord[] = [];
