import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scModelFormFieldsFor } from "@/lib/sample-data/service-centre-models";
import { getScBrandOptionsForPartner } from "@/lib/sample-data/service-centre-brands";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createServiceCentreModelAction } from "@/lib/serviceCentreCatalogActions";

registerPage({
  id: "service-centre.models.create",
  moduleSlug: "service-centre",
  title: "Device Models — Create",
  path: "/partner/[partnerId]/service-centre/models/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new model entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/models/new/page.tsx",
});

export default async function NewScModelPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.models.create", "Device Models");
  if (tierGate) return <AppShell topbarTitle={"New Model"}>{tierGate}</AppShell>;

  const brandNames = await getScBrandOptionsForPartner(params.partnerId);
  const fields = await applyCustomizations("service-centre.models.create", scModelFormFieldsFor(brandNames));

  return (
    <AppShell topbarTitle="New Model">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Model</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new model entry.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Model"
            action={createServiceCentreModelAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
