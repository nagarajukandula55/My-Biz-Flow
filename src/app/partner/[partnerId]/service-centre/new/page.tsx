import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { createServiceCentreWorkorderAction } from "@/lib/serviceCentreCreateAction";
import { lookupServiceCentreCustomerAction } from "@/lib/serviceCentreCustomerLookup";
import { buildServiceCentreCreateFields } from "@/lib/serviceCentreCreateFields";

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

export default async function NewServiceCentrePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("service-centre");
  // Shared with the list page's quick-create modal — see
  // lib/serviceCentreCreateFields.ts. Domain-scoped Device Type,
  // brand-scoped Model suggestions, catalog "+ Add new" links.
  const fields = await buildServiceCentreCreateFields(params.partnerId);

  return (
    <AppShell topbarTitle={`New Workorder — ${mod?.label ?? "Service Centre"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Workorder</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new workorder record for Service Centre.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Workorder"
            mode="create"
            layout="columns"
            action={createServiceCentreWorkorderAction.bind(null, params.partnerId)}
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
