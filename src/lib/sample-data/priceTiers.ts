import type { Column, Row } from "@/components/DataTable";
import type { RecordField } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import type { PriceTierRow } from "@/lib/wholesaleData";

// Field vocabulary for the Wholesale B2B "Price Tiers" sub-page (PriceTier,
// Prisma-backed — see src/lib/wholesaleData.ts).

export const priceTierColumns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "discountPercent", label: "Discount %", type: "text" },
];

export const priceTierFormFields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "discountPercent", label: "Discount %", type: "number", required: true },
];

export function priceTierToRow(t: PriceTierRow): Row {
  return { id: t.id, name: t.name, discountPercent: t.discountPercent };
}

export function getPriceTierDetailFields(row: Row): RecordField[] {
  return [
    { label: "Name", value: row["name"], type: "text" },
    { label: "Discount %", value: row["discountPercent"], type: "percentage" },
  ];
}
