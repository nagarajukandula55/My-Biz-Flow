import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { lookupServiceCentreCustomerAction } from "@/lib/serviceCentreCustomerLookup";
import { listBusinessRecords } from "@/lib/businessRecords";
import type { FormFieldDef } from "@/components/RecordForm";
import { getPartner } from "@/lib/partnerData";
import { parseProductDomains } from "@/lib/catalog/productDomains";
import { categoryOptionsForDomains } from "@/lib/catalog/serviceCatalog";
import { filterByDomains } from "@/lib/sample-data/service-centre-brands";

registerPage({
  id: "service-centre.create",
  moduleSlug: "service-centre",
  title: "Service Centre — Create",
  path: "/partner/[partnerId]/service-centre/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new workorder, built from the module's real field set via the shared RecordForm component and grouped into the same intake sections as the AN-CRM reference app: Customer, Address, Device, Issue — followed by this app's own Job handling and Notes sections. Collects the full customer block (phone, email, company, GSTIN, address/city/state/pincode) so the printed invoice can render a real Bill To, a correct B2B/B2C document type, and the right CGST+SGST vs IGST split from the place of supply. Typing a phone number prefills a returning customer from the Billing module's Contacts, falling back to their most recent past workorder (see serviceCentreCustomerLookup.ts). Device Type, Brand, Model, IMEI/Serial, Appearance, File Backup and Warranty Type are all captured at intake; Brand/Model are free-text comboboxes backed by this partner's own Brands/Models catalogs with a link to add a new one, so an uncatalogued device never blocks a walk-in — which is also what lets a Starter partner, who has no access to the Brand/Model catalog pages at all (those are Pro+), book any job in by simply typing the brand and model. Device Type, Brand and Model are all scoped to the partner's own declared product domain(s) (Partner.productDomains): electronics categories/brands for an electronics shop, vehicle classes/brands for an automobile shop, and both under domain optgroup headings for a shop that does both. Technician assignment still happens afterward from the workorder's detail page (WorkorderLifecycle). Real persistence (BusinessRecord, Prisma-backed).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/new/page.tsx",
});

/**
 * Sorted, de-duplicated, non-empty values of one column across a record
 * set — used to offer real existing Brands/Models/"logged by" names as
 * datalist suggestions without ever constraining the field to them.
 */
function distinct(rows: Record<string, unknown>[], key: string): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = String(row[key] ?? "").trim();
    if (value) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export default async function NewServiceCentrePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("service-centre");
  const baseFields = await applyCustomizations("service-centre.create", serviceCentreFormFields);

  // Brand/Model stay free text (a device that isn't catalogued yet must
  // never block a walk-in from being booked in) but are backed by this
  // partner's own live catalogs as suggestions, with a link straight to
  // each catalog's own create page for anything genuinely new.
  // Which product domain(s) this partner declared at signup (editable from
  // Settings). Everything below is scoped to it: an electronics-only shop
  // never sees a vehicle class or a vehicle brand, an automobile-only shop
  // never sees a device category, and a shop doing both gets one Device
  // Type select with domain <optgroup> headings.
  const partner = await getPartner(params.partnerId);
  const domains = parseProductDomains(partner?.productDomains);

  const [brands, models, priorJobs] = await Promise.all([
    listBusinessRecords(params.partnerId, "service-centre-brands"),
    listBusinessRecords(params.partnerId, "service-centre-models"),
    listBusinessRecords(params.partnerId, "service-centre"),
  ]);
  const base = `/partner/${params.partnerId}/service-centre`;
  const suggestionsByKey: Record<string, string[]> = {
    brandName: distinct(filterByDomains(brands, domains), "name"),
    modelName: distinct(filterByDomains(models, domains), "name"),
    // Real names already used on this partner's past workorders — the
    // front-desk roster in practice, without inventing one.
    loggedBy: distinct(priorJobs, "loggedBy"),
  };
  const addNewByKey: Record<string, { label: string; href: string }> = {
    brandName: { label: "Add new brand", href: `${base}/brands/new` },
    modelName: { label: "Add new model", href: `${base}/models/new` },
  };
  // Device Type is the one field whose OPTIONS (not just suggestions) vary
  // with the domain — the electronics DEVICE_CATEGORIES list, the
  // VEHICLE_CATEGORIES list, or both under optgroup headings. Never a
  // merged single taxonomy; see src/lib/catalog/serviceCatalog.ts.
  const categoryOptions = categoryOptionsForDomains(domains);
  const fields: FormFieldDef[] = baseFields.map((f) => ({
    ...f,
    ...(f.key === "deviceCategory" ? categoryOptions : {}),
    ...(suggestionsByKey[f.key]?.length ? { suggestions: suggestionsByKey[f.key] } : {}),
    ...(addNewByKey[f.key] ? { addNew: addNewByKey[f.key] } : {}),
  }));

  return (
    <AppShell topbarTitle={`New Workorder — ${mod?.label ?? "Service Centre"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Workorder</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new workorder record for Service Centre.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Workorder"
            action={createBusinessRecordAction.bind(null, params.partnerId, "service-centre")}
            lookup={{
              watchKey: "customerPhone",
              run: lookupServiceCentreCustomerAction.bind(null, params.partnerId),
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
