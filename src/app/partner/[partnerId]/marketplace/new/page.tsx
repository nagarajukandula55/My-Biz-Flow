import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { marketplaceFormFields } from "@/lib/sample-data/marketplace";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "marketplace.create",
  moduleSlug: "marketplace",
  title: "Marketplace / Partner Aggregator — Create",
  path: "/partner/[partnerId]/marketplace/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new partner listing in the marketplace module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/new/page.tsx",
});

export default async function NewMarketplacePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("marketplace");
  const fields = await applyCustomizations("marketplace.create", marketplaceFormFields);

  return (
    <AppShell topbarTitle={`New Partner Listing — ${mod?.label ?? "Marketplace / Partner Aggregator"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Partner Listing</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new partner listing record for Marketplace / Partner Aggregator.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Partner Listing"
            action={createBusinessRecordAction.bind(null, params.partnerId, "marketplace")}
          />
        </div>
      </div>
    </AppShell>
  );
}
