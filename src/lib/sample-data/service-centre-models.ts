import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { getScBrandOptions, brandRowDomain } from "./service-centre-brands";
import { PRODUCT_DOMAINS, PRODUCT_DOMAIN_LABELS } from "@/lib/catalog/productDomains";

// Model catalog owned by the service-centre module, each model belonging to
// one Brand from service-centre-brands.ts. Partner-owned data.
//
// Carries the same `domain` tag as the brand catalog, for the same reasons
// and with the same fallback (untagged == ELECTRONICS) — see that file's
// header note, which also records why vehicles share this module rather
// than getting a parallel one. Electronics models and vehicle models are
// never shown as one undifferentiated list: the workorder intake form
// filters both catalogs down to the partner's own productDomains.

export const scModelColumns: Column[] = [
  { key: "id", label: "Model Code", type: "text" },
  { key: "brandName", label: "Brand", type: "relation-link" },
  { key: "domain", label: "Deals In", type: "select-chip" },
  { key: "name", label: "Model Name", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scModelRows: Row[] = [
  // --- ELECTRONICS ---
  { id: "SCM-001", brandName: "Samsung", domain: "ELECTRONICS", name: "Galaxy S23", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-002", brandName: "Apple", domain: "ELECTRONICS", name: "iPhone 14", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-003", brandName: "Xiaomi", domain: "ELECTRONICS", name: "Redmi Note 12", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-004", brandName: "Dell", domain: "ELECTRONICS", name: "Inspiron 15 3520", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-005", brandName: "HP", domain: "ELECTRONICS", name: "Pavilion 14", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-006", brandName: "Sony", domain: "ELECTRONICS", name: "Bravia X75L 55\"", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-007", brandName: "LG", domain: "ELECTRONICS", name: "GL-T292RPZY Double Door", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-008", brandName: "Whirlpool", domain: "ELECTRONICS", name: "Stainwash Pro 7.5 kg", status: "Active", moduleSlug: "service-centre" },

  // --- AUTOMOBILE --- real, currently-sold Indian-market models, each
  // under the brand that actually makes it.
  { id: "SCM-101", brandName: "Hero MotoCorp", domain: "AUTOMOBILE", name: "Splendor Plus", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-102", brandName: "Hero MotoCorp", domain: "AUTOMOBILE", name: "HF Deluxe", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-103", brandName: "Bajaj Auto", domain: "AUTOMOBILE", name: "Pulsar 150", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-104", brandName: "Bajaj Auto", domain: "AUTOMOBILE", name: "Platina 100", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-105", brandName: "Royal Enfield", domain: "AUTOMOBILE", name: "Classic 350", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-106", brandName: "Royal Enfield", domain: "AUTOMOBILE", name: "Hunter 350", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-107", brandName: "TVS Motor", domain: "AUTOMOBILE", name: "Jupiter 110", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-108", brandName: "TVS Motor", domain: "AUTOMOBILE", name: "Apache RTR 160", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-109", brandName: "Honda Motorcycle & Scooter India", domain: "AUTOMOBILE", name: "Activa 6G", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-110", brandName: "Honda Motorcycle & Scooter India", domain: "AUTOMOBILE", name: "Shine 125", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-111", brandName: "Yamaha", domain: "AUTOMOBILE", name: "FZ-S FI", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-112", brandName: "Suzuki Motorcycle", domain: "AUTOMOBILE", name: "Access 125", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-113", brandName: "Ola Electric", domain: "AUTOMOBILE", name: "S1 Pro", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-114", brandName: "Ather Energy", domain: "AUTOMOBILE", name: "450X", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-115", brandName: "Maruti Suzuki", domain: "AUTOMOBILE", name: "Swift", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-116", brandName: "Maruti Suzuki", domain: "AUTOMOBILE", name: "Baleno", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-117", brandName: "Maruti Suzuki", domain: "AUTOMOBILE", name: "Wagon R", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-118", brandName: "Hyundai", domain: "AUTOMOBILE", name: "i20", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-119", brandName: "Hyundai", domain: "AUTOMOBILE", name: "Creta", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-120", brandName: "Tata Motors", domain: "AUTOMOBILE", name: "Nexon", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-121", brandName: "Tata Motors", domain: "AUTOMOBILE", name: "Punch", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-122", brandName: "Mahindra & Mahindra", domain: "AUTOMOBILE", name: "Scorpio-N", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-123", brandName: "Mahindra & Mahindra", domain: "AUTOMOBILE", name: "Bolero", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-124", brandName: "Honda Cars India", domain: "AUTOMOBILE", name: "City", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-125", brandName: "Toyota", domain: "AUTOMOBILE", name: "Innova Crysta", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-126", brandName: "Kia", domain: "AUTOMOBILE", name: "Seltos", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-127", brandName: "Tata Motors", domain: "AUTOMOBILE", name: "Ace Gold", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-128", brandName: "Ashok Leyland", domain: "AUTOMOBILE", name: "Dost+", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-129", brandName: "Force Motors", domain: "AUTOMOBILE", name: "Traveller 3350", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-130", brandName: "Piaggio", domain: "AUTOMOBILE", name: "Ape Xtra LDX", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-131", brandName: "Sonalika", domain: "AUTOMOBILE", name: "DI 745 III", status: "Active", moduleSlug: "service-centre" },
  { id: "SCM-132", brandName: "John Deere", domain: "AUTOMOBILE", name: "5050 D", status: "Active", moduleSlug: "service-centre" },
];

export const scModelFormFields: FormFieldDef[] = [
  { key: "id", label: "Model Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "brandName", label: "Brand", type: "select", required: true, options: getScBrandOptions().map((o) => o.label) },
  // Tagged on the model too rather than only inherited from the brand: the
  // brand field stores a NAME, not a foreign key, so a hand-typed or
  // renamed brand would otherwise leave the model with no resolvable
  // domain and drop it out of every filtered list.
  {
    key: "domain",
    label: "Deals In",
    type: "select",
    required: true,
    options: [...PRODUCT_DOMAINS],
    optionLabels: PRODUCT_DOMAIN_LABELS,
  },
  { key: "name", label: "Model Name", type: "text", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
];

/**
 * `scModelFormFields`'s own `brandName` options are the static demo
 * `scBrandRows` (Samsung, Apple, Xiaomi, ...) — fine for the Design System
 * reference page, but every real "New Model" surface must offer THIS
 * partner's actual Brand catalog instead, or a brand they just created
 * (e.g. via "+ Add new brand") can never be picked here. Pass the live,
 * partner-scoped brand names (see `getScBrandOptions`-style callers —
 * typically `distinct(filterByDomains(brands, domains), "name")`).
 */
export function scModelFormFieldsFor(brandNames: string[]): FormFieldDef[] {
  return scModelFormFields.map((f) => (f.key === "brandName" ? { ...f, options: brandNames } : f));
}

export function getScModelRecord(recordId: string): Row {
  return scModelRows.find((r) => String(r["id"]) === recordId) ?? scModelRows[0];
}

export function getScModelDetailFields(record: Row): RecordField[] {
  return [
    { label: "Model Code", value: record["id"], type: "text" },
    { label: "Brand", value: record["brandName"], type: "relation" },
    { label: "Deals In", value: PRODUCT_DOMAIN_LABELS[brandRowDomain(record)], type: "text" },
    { label: "Model Name", value: record["name"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getScModelTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Model "${record["name"]}" added`, timestamp: "2026-07-01T09:00:00", actor: "Partner Admin" }];
}

export const scModelRelated: RelatedRecord[] = [];

export function getScModelOptions(): { value: string; label: string }[] {
  return scModelRows
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"]) }));
}
