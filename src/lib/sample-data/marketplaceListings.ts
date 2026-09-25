import type { Column, Row } from "@/components/DataTable";
import type { RecordField } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { paiseToRupees, type MarketplaceListingRow } from "@/lib/marketplace";

// Field vocabulary for the Marketplace "Listings" pages (MarketplaceListing,
// Prisma-backed — see src/lib/marketplace.ts). Money fields render in
// rupees; the underlying column is paise. Deliberately a separate file from
// src/lib/sample-data/marketplace.ts, which stays in place unchanged as the
// static sample-data source for the cross-module MODULE_DATA/fieldSchema
// registries (src/lib/moduleData.ts, src/lib/designer/fieldSchema.ts) — the
// same "old sample-data file kept for those, new file for the real
// Prisma-backed pages" split already used by manufacturing.

export const marketplaceListingColumns: Column[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "stockQuantity", label: "Stock Quantity", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export const marketplaceListingFormFields: FormFieldDef[] = [
  { key: "title", label: "Title", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea", required: false },
  { key: "category", label: "Category", type: "text", required: false },
  { key: "price", label: "Price (₹)", type: "currency", required: true },
  { key: "stockQuantity", label: "Stock Quantity", type: "number", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export function marketplaceListingToRow(l: MarketplaceListingRow): Row {
  return {
    id: l.id,
    title: l.title,
    description: l.description ?? "",
    category: l.category ?? "",
    price: paiseToRupees(l.price),
    stockQuantity: l.stockQuantity,
    isActive: l.isActive,
  };
}

export function getMarketplaceListingDetailFields(row: Row): RecordField[] {
  return [
    { label: "Title", value: row["title"], type: "text" },
    { label: "Description", value: row["description"], type: "text" },
    { label: "Category", value: row["category"], type: "text" },
    { label: "Price", value: row["price"], type: "currency" },
    { label: "Stock Quantity", value: row["stockQuantity"], type: "text" },
    { label: "Active", value: row["isActive"], type: "boolean" },
  ];
}
