import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { DEVICE_CATEGORIES, DEVICE_CATEGORY_LABELS } from "./service-centre";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_GROUPS,
  VEHICLE_CATEGORY_LABELS,
} from "@/lib/catalog/vehicleCategory";
import {
  PRODUCT_DOMAINS,
  PRODUCT_DOMAIN_LABELS,
  type ProductDomain,
} from "@/lib/catalog/productDomains";

// Brand catalog owned by the service-centre module (distinct from the
// multi-location "Brand" module — this is "brand of the thing being
// serviced", e.g. Samsung, Maruti Suzuki). Partner-owned data, not shared.
//
// ELECTRONICS: the reference app's device taxonomy
// (src/lib/sample-data/service-centre.ts's DEVICE_CATEGORIES, ported 1:1
// from its own 45-value list) contains no vehicle category at all. The
// two-wheeler brands/models that used to sit in this file untagged were
// invented by an earlier build pass, not ported, and misrepresented what
// the module is for.
//
// AUTOMOBILE: added later on direct product request — explicitly NOT a
// port, since the reference app has no vehicle concept anywhere. A partner
// declares which domain(s) they deal in (Partner.productDomains, see
// src/lib/catalog/productDomains.ts for why that is a Partner-level field
// and not a second PartnerType).
//
// Vehicle brands live in THIS SAME catalog rather than a parallel module,
// because everything about a brand row — its columns, its CRUD pages, its
// Pro-tier gate (`service-centre.brands.*` in DEFAULT_PAGE_TIERS) — is
// identical for both domains; a second module would mean a second gate and
// a second set of pages to keep in sync forever. What stops the two from
// mixing is the required `domain` tag on every row: the two taxonomies are
// never merged into one list, the picker always groups them under domain
// headings, and every read path filters by the partner's own domains.
//
// `category` holds a DEVICE_CATEGORIES or VEHICLE_CATEGORIES label,
// according to `domain`.

export const scBrandColumns: Column[] = [
  { key: "id", label: "Brand Code", type: "text" },
  { key: "name", label: "Brand Name", type: "text" },
  { key: "domain", label: "Deals In", type: "select-chip" },
  { key: "category", label: "Device / Vehicle Type", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scBrandRows: Row[] = [
  // --- ELECTRONICS ---
  { id: "SCB-001", name: "Samsung", domain: "ELECTRONICS", category: "Mobile Phones", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-002", name: "Apple", domain: "ELECTRONICS", category: "Mobile Phones", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-003", name: "Xiaomi", domain: "ELECTRONICS", category: "Mobile Phones", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-004", name: "Dell", domain: "ELECTRONICS", category: "Laptops", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-005", name: "HP", domain: "ELECTRONICS", category: "Laptops", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-006", name: "Sony", domain: "ELECTRONICS", category: "Television", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-007", name: "LG", domain: "ELECTRONICS", category: "Refrigerator", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-008", name: "Whirlpool", domain: "ELECTRONICS", category: "Washing Machine", status: "Active", moduleSlug: "service-centre" },

  // --- AUTOMOBILE --- real manufacturers selling in the Indian market,
  // each catalogued under the vehicle class it is best known for.
  { id: "SCB-101", name: "Hero MotoCorp", domain: "AUTOMOBILE", category: "Motorcycle", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-102", name: "Bajaj Auto", domain: "AUTOMOBILE", category: "Motorcycle", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-103", name: "Royal Enfield", domain: "AUTOMOBILE", category: "Motorcycle", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-104", name: "TVS Motor", domain: "AUTOMOBILE", category: "Scooter", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-105", name: "Honda Motorcycle & Scooter India", domain: "AUTOMOBILE", category: "Scooter", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-106", name: "Yamaha", domain: "AUTOMOBILE", category: "Motorcycle", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-107", name: "Suzuki Motorcycle", domain: "AUTOMOBILE", category: "Scooter", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-108", name: "Ola Electric", domain: "AUTOMOBILE", category: "Electric Two-Wheeler", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-109", name: "Ather Energy", domain: "AUTOMOBILE", category: "Electric Two-Wheeler", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-110", name: "Maruti Suzuki", domain: "AUTOMOBILE", category: "Car — Hatchback", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-111", name: "Hyundai", domain: "AUTOMOBILE", category: "Car — Hatchback", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-112", name: "Tata Motors", domain: "AUTOMOBILE", category: "Car — SUV", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-113", name: "Mahindra & Mahindra", domain: "AUTOMOBILE", category: "Car — SUV", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-114", name: "Honda Cars India", domain: "AUTOMOBILE", category: "Car — Sedan", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-115", name: "Toyota", domain: "AUTOMOBILE", category: "Car — MUV / Van", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-116", name: "Kia", domain: "AUTOMOBILE", category: "Car — SUV", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-117", name: "MG Motor", domain: "AUTOMOBILE", category: "Car — SUV", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-118", name: "Renault", domain: "AUTOMOBILE", category: "Car — Hatchback", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-119", name: "Skoda", domain: "AUTOMOBILE", category: "Car — Sedan", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-120", name: "Volkswagen", domain: "AUTOMOBILE", category: "Car — Hatchback", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-121", name: "Ashok Leyland", domain: "AUTOMOBILE", category: "Truck / Heavy Commercial Vehicle", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-122", name: "Eicher Motors", domain: "AUTOMOBILE", category: "Truck / Heavy Commercial Vehicle", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-123", name: "Force Motors", domain: "AUTOMOBILE", category: "Bus / Tempo Traveller", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-124", name: "Piaggio", domain: "AUTOMOBILE", category: "Auto Rickshaw / Three-Wheeler", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-125", name: "Sonalika", domain: "AUTOMOBILE", category: "Tractor", status: "Active", moduleSlug: "service-centre" },
  { id: "SCB-126", name: "John Deere", domain: "AUTOMOBILE", category: "Tractor", status: "Active", moduleSlug: "service-centre" },
];

/**
 * Every category LABEL either taxonomy offers, concatenated for the
 * catalog's own picker — never merged into one taxonomy. The <optgroup>
 * headings below are what keep a vehicle class from ever reading as a
 * device type.
 */
export const SC_BRAND_CATEGORY_OPTIONS: string[] = [
  ...DEVICE_CATEGORIES.map((c) => DEVICE_CATEGORY_LABELS[c]),
  ...VEHICLE_CATEGORIES.map((c) => VEHICLE_CATEGORY_LABELS[c]),
];

export const SC_BRAND_CATEGORY_GROUPS: Record<string, string> = {
  ...Object.fromEntries(
    DEVICE_CATEGORIES.map((c) => [DEVICE_CATEGORY_LABELS[c], PRODUCT_DOMAIN_LABELS.ELECTRONICS])
  ),
  ...Object.fromEntries(
    VEHICLE_CATEGORIES.map((c) => [
      VEHICLE_CATEGORY_LABELS[c],
      `Automobiles — ${VEHICLE_CATEGORY_GROUPS[c] ?? "Other"}`,
    ])
  ),
};

export const scBrandFormFields: FormFieldDef[] = [
  { key: "id", label: "Brand Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "name", label: "Brand Name", type: "text", required: true },
  // Which catalog this brand belongs to. Required — an untagged brand
  // would surface on the wrong partner's intake form.
  {
    key: "domain",
    label: "Deals In",
    type: "select",
    required: true,
    options: [...PRODUCT_DOMAINS],
    optionLabels: PRODUCT_DOMAIN_LABELS,
  },
  // The device/vehicle type this brand is catalogued under — the same
  // taxonomies the workorder intake form's "Device Type" uses, so a brand
  // and the job it's picked on can never disagree about what kind of thing
  // is being talked about.
  {
    key: "category",
    label: "Device / Vehicle Type",
    type: "select",
    required: false,
    options: SC_BRAND_CATEGORY_OPTIONS,
    optionGroups: SC_BRAND_CATEGORY_GROUPS,
  },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

export function getScBrandRecord(recordId: string): Row {
  return scBrandRows.find((r) => String(r["id"]) === recordId) ?? scBrandRows[0];
}

export function getScBrandDetailFields(record: Row): RecordField[] {
  return [
    { label: "Brand Code", value: record["id"], type: "text" },
    { label: "Brand Name", value: record["name"], type: "text" },
    {
      label: "Deals In",
      value: PRODUCT_DOMAIN_LABELS[brandRowDomain(record)],
      type: "text",
    },
    { label: "Device / Vehicle Type", value: record["category"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getScBrandTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Brand "${record["name"]}" added`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" }];
}

export const scBrandRelated: RelatedRecord[] = [];

export function getScBrandOptions(): { value: string; label: string }[] {
  return scBrandRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}

/**
 * A catalog row's domain, defaulting to ELECTRONICS for any row created
 * before the `domain` tag existed — those rows are electronics by
 * definition, since that is all this catalog held at the time.
 */
export function brandRowDomain(row: Record<string, unknown>): ProductDomain {
  return row["domain"] === "AUTOMOBILE" ? "AUTOMOBILE" : "ELECTRONICS";
}

/**
 * Catalog rows (brands or models — both carry the same `domain` tag)
 * belonging to any of the partner's declared domains.
 */
export function filterByDomains<T extends Record<string, unknown>>(
  rows: T[],
  domains: ProductDomain[]
): T[] {
  return rows.filter((r) => domains.includes(brandRowDomain(r)));
}
