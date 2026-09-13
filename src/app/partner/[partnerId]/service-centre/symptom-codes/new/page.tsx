import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scSymptomCodeFormFields } from "@/lib/sample-data/service-centre-symptom-codes";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.symptom-codes.create",
  moduleSlug: "service-centre",
  title: "Symptom Codes — Create",
  path: "/partner/[partnerId]/service-centre/symptom-codes/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new symptom code entry, built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/symptom-codes/new/page.tsx",
});

export default async function NewScSymptomCodePage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("service-centre.symptom-codes.create", scSymptomCodeFormFields);

  return (
    <AppShell topbarTitle="New Symptom Code">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Symptom Code</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new symptom code entry.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Symptom Code"
            action={createBusinessRecordAction.bind(null, params.partnerId, "service-centre-symptom-codes")}
          />
        </div>
      </div>
    </AppShell>
  );
}
