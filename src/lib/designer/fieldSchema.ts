/**
 * Maps every registered pageId to the real field/column definitions the
 * Designer editor can introspect and let a Super Admin edit — one row per
 * module, since `columns` (list/detail) and `formFields` (create/edit)
 * already live in each module's `src/lib/sample-data/<slug>.ts` and share
 * the same key/label vocabulary (see DESIGN_SYSTEM.md §7-8).
 */

import type { Column } from "@/components/DataTable";
import type { FormFieldDef } from "@/components/RecordForm";

import { accountingGstColumns, accountingGstFormFields } from "@/lib/sample-data/accounting-gst";
import { amcFieldServiceColumns, amcFieldServiceFormFields } from "@/lib/sample-data/amc-field-service";
import { billingColumns, billingFormFields } from "@/lib/sample-data/billing";
import { brandColumns, brandFormFields } from "@/lib/sample-data/brand";
import { clinicColumns, clinicFormFields } from "@/lib/sample-data/clinic";
import { educationColumns, educationFormFields } from "@/lib/sample-data/education";
import { eventBookingColumns, eventBookingFormFields } from "@/lib/sample-data/event-booking";
import { hrmsColumns, hrmsFormFields } from "@/lib/sample-data/hrms";
import { inventoryColumns, inventoryFormFields } from "@/lib/sample-data/inventory";
import { legalColumns, legalFormFields } from "@/lib/sample-data/legal";
import { logisticsFleetColumns, logisticsFleetFormFields } from "@/lib/sample-data/logistics-fleet";
import { loyaltyRewardsColumns, loyaltyRewardsFormFields } from "@/lib/sample-data/loyalty-rewards";
import { manufacturingColumns, manufacturingFormFields } from "@/lib/sample-data/manufacturing";
import { marketplaceColumns, marketplaceFormFields } from "@/lib/sample-data/marketplace";
import { posColumns, posFormFields } from "@/lib/sample-data/pos";
import { realEstateColumns, realEstateFormFields } from "@/lib/sample-data/real-estate";
import { rentalsColumns, rentalsFormFields } from "@/lib/sample-data/rentals";
import { restaurantPosColumns, restaurantPosFormFields } from "@/lib/sample-data/restaurant-pos";
import { serviceCentreColumns, serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { subscriptionsColumns, subscriptionsFormFields } from "@/lib/sample-data/subscriptions";
import { wholesaleB2bColumns, wholesaleB2bFormFields } from "@/lib/sample-data/wholesale-b2b";

const MODULE_SCHEMA: Record<string, { columns: Column[]; formFields: FormFieldDef[] }> = {
  "accounting-gst": { columns: accountingGstColumns, formFields: accountingGstFormFields },
  "amc-field-service": { columns: amcFieldServiceColumns, formFields: amcFieldServiceFormFields },
  billing: { columns: billingColumns, formFields: billingFormFields },
  brand: { columns: brandColumns, formFields: brandFormFields },
  clinic: { columns: clinicColumns, formFields: clinicFormFields },
  education: { columns: educationColumns, formFields: educationFormFields },
  "event-booking": { columns: eventBookingColumns, formFields: eventBookingFormFields },
  hrms: { columns: hrmsColumns, formFields: hrmsFormFields },
  inventory: { columns: inventoryColumns, formFields: inventoryFormFields },
  legal: { columns: legalColumns, formFields: legalFormFields },
  "logistics-fleet": { columns: logisticsFleetColumns, formFields: logisticsFleetFormFields },
  "loyalty-rewards": { columns: loyaltyRewardsColumns, formFields: loyaltyRewardsFormFields },
  manufacturing: { columns: manufacturingColumns, formFields: manufacturingFormFields },
  marketplace: { columns: marketplaceColumns, formFields: marketplaceFormFields },
  pos: { columns: posColumns, formFields: posFormFields },
  "real-estate": { columns: realEstateColumns, formFields: realEstateFormFields },
  rentals: { columns: rentalsColumns, formFields: rentalsFormFields },
  "restaurant-pos": { columns: restaurantPosColumns, formFields: restaurantPosFormFields },
  "service-centre": { columns: serviceCentreColumns, formFields: serviceCentreFormFields },
  subscriptions: { columns: subscriptionsColumns, formFields: subscriptionsFormFields },
  "wholesale-b2b": { columns: wholesaleB2bColumns, formFields: wholesaleB2bFormFields },
};

export type SchemaField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

/**
 * Given a registered pageId ("pos.list", "pos.create", "pos.detail", ...),
 * return the underlying field/column definitions the Designer editor
 * should list. list/detail pages show columns (detail pages render the
 * same key/label vocabulary via the field grid); create/edit pages show
 * the module's form fields, since those are the ones a Super Admin
 * actually edits shape for.
 */
/** Placeholder set for the Service Centre Sales Invoice — doesn't match serviceCentreColumns
 * (a different field set: GST totals, Bill To address, not the workorder's own columns), so it
 * needs its own entry rather than falling through to the generic module schema below. */
const SERVICE_CENTRE_INVOICE_FIELDS: SchemaField[] = [
  { key: "customerName", label: "Customer Name", type: "text" },
  { key: "customerPhone", label: "Customer Phone", type: "text" },
  { key: "customerCity", label: "Customer City", type: "text" },
  { key: "customerState", label: "Customer State", type: "text" },
  { key: "invoiceDate", label: "Invoice Date", type: "date" },
  { key: "taxableTotal", label: "Taxable Amount", type: "currency" },
  { key: "taxAmount", label: "GST Amount", type: "currency" },
  { key: "totalAmount", label: "Grand Total", type: "currency" },
];

export function getFieldSchema(pageId: string): SchemaField[] | null {
  if (pageId === "service-centre.invoice") return SERVICE_CENTRE_INVOICE_FIELDS;

  const [moduleSlug, kind] = pageId.split(".");
  const schema = MODULE_SCHEMA[moduleSlug];
  if (!schema) return null;

  if (kind === "create" || kind === "edit") {
    return schema.formFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options,
    }));
  }
  // list, detail, and anything else fall back to the column schema.
  return schema.columns.map((c) => ({
    key: c.key,
    label: c.label,
    type: c.type,
  }));
}
