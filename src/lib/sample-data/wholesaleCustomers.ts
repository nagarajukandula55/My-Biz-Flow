import type { Column, Row } from "@/components/DataTable";
import type { RecordField } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { paiseToRupees, type WholesaleCustomerRow } from "@/lib/wholesaleData";

// Field vocabulary for the Wholesale B2B "Customers" sub-page (WholesaleCustomer,
// Prisma-backed — see src/lib/wholesaleData.ts). Money fields render in rupees;
// the underlying column is paise.

export const wholesaleCustomerColumns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "gstin", label: "GSTIN", type: "text" },
  { key: "creditLimit", label: "Credit Limit", type: "currency" },
  { key: "creditTermDays", label: "Credit Term (days)", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export const wholesaleCustomerFormFields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "contact", label: "Contact", type: "text", required: false },
  { key: "gstin", label: "GSTIN", type: "text", required: false },
  { key: "creditLimit", label: "Credit Limit (₹, 0 = no limit)", type: "currency", required: false },
  { key: "creditTermDays", label: "Credit Term (days)", type: "number", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export function wholesaleCustomerToRow(c: WholesaleCustomerRow): Row {
  return {
    id: c.id,
    name: c.name,
    contact: c.contact ?? "",
    gstin: c.gstin ?? "",
    creditLimit: paiseToRupees(c.creditLimit),
    creditTermDays: c.creditTermDays,
    isActive: c.isActive,
  };
}

export function getWholesaleCustomerDetailFields(row: Row): RecordField[] {
  return [
    { label: "Name", value: row["name"], type: "text" },
    { label: "Contact", value: row["contact"], type: "text" },
    { label: "GSTIN", value: row["gstin"], type: "text" },
    { label: "Credit Limit", value: row["creditLimit"], type: "currency" },
    { label: "Credit Term (days)", value: row["creditTermDays"], type: "text" },
    { label: "Active", value: row["isActive"], type: "boolean" },
  ];
}
