import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scModelFormFields } from "@/lib/sample-data/service-centre-models";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.models.create",
  moduleSlug: "service-centre",
  title: "Device Models — Create",
  path: "/vendor/[vendorId]/service-centre/models/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new model entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/models/new/page.tsx",
});

export default async function NewScModelPage({ params }: { params: { vendorId: string } }) {
  const fields = await applyCustomizations("service-centre.models.create", scModelFormFields);

  return (
    <AppShell topbarTitle="New Model">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Model</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new model entry.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Model"
            action={createBusinessRecordAction.bind(null, params.vendorId, "service-centre-models")}
          />
        </div>
      </div>
    </AppShell>
  );
}
