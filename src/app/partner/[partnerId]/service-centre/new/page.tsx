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
  explanation: "A config-driven creation form for a new workorder, built from the module's real field set via the shared RecordForm component and grouped into the same intake sections as the AN-CRM reference app: Customer, Address, Device, Issue — followed by this app's own Job handling and Notes sections. Collects the full customer block (phone, email, company, GSTIN, address/city/state/pincode) so the printed invoice can render a real Bill To, a correct B2B/B2C document type, and the right CGST+SGST vs IGST split from the place of supply. Typing a phone number prefills a returning customer from the Billing module's Contacts, falling back to their most recent past workorder (see serviceCentreCustomerLookup.ts). Device Type, Brand, Model, IMEI/Serial, Appearance, File Backup and Warranty Type are all captured at intake; Brand/Model are free-text comboboxes backed by this partner's own Brands/Models catalogs with a link to add a new one, so an uncatalogued device never blocks a walk-in. Technician assignment still happens afterward from the workorder's detail page (WorkorderLifecycle). Real persistence (BusinessRecord, Prisma-backed).",
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
  const [brands, models, priorJobs] = await Promise.all([
    listBusinessRecords(params.partnerId, "service-centre-brands"),
    listBusinessRecords(params.partnerId, "service-centre-models"),
    listBusinessRecords(params.partnerId, "service-centre"),
  ]);
  const base = `/partner/${params.partnerId}/service-centre`;
  const suggestionsByKey: Record<string, string[]> = {
    brandName: distinct(brands, "name"),
    modelName: distinct(models, "name"),
    // Real names already used on this partner's past workorders — the
    // front-desk roster in practice, without inventing one.
    loggedBy: distinct(priorJobs, "loggedBy"),
  };
  const addNewByKey: Record<string, { label: string; href: string }> = {
    brandName: { label: "Add new brand", href: `${base}/brands/new` },
    modelName: { label: "Add new model", href: `${base}/models/new` },
  };
  const fields: FormFieldDef[] = baseFields.map((f) => ({
    ...f,
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
