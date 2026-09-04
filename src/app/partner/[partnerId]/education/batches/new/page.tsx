import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { educationBatchFormFields } from "@/lib/sample-data/education";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "education.batches.create",
  moduleSlug: "education",
  title: "Batches — Create",
  path: "/partner/[partnerId]/education/batches/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new batch entry (with its seat capacity), built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/education/batches/new/page.tsx",
});

export default async function NewEducationBatchPage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("education.batches.create", educationBatchFormFields);

  return (
    <AppShell topbarTitle="New Batch">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Batch</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new batch entry with its seat capacity.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Batch"
            action={createBusinessRecordAction.bind(null, params.partnerId, "education-batches")}
          />
        </div>
      </div>
    </AppShell>
  );
}
