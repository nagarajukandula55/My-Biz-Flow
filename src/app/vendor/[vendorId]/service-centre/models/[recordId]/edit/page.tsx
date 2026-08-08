import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scModelFormFields } from "@/lib/sample-data/service-centre-models";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.models.edit",
  moduleSlug: "service-centre",
  title: "Device Models — Edit",
  path: "/vendor/[vendorId]/service-centre/models/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing model's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/models/[recordId]/edit/page.tsx",
});

export default async function EditScModelPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "service-centre-models", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.models.edit", scModelFormFields);

  return (
    <AppShell topbarTitle="Edit Model">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Model</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["name"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "service-centre-models", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
