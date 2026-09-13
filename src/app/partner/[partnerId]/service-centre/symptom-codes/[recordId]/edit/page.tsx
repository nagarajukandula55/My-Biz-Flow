import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scSymptomCodeFormFields } from "@/lib/sample-data/service-centre-symptom-codes";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.symptom-codes.edit",
  moduleSlug: "service-centre",
  title: "Symptom Codes — Edit",
  path: "/partner/[partnerId]/service-centre/symptom-codes/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing symptom code's data, letting a user edit and save changes.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/symptom-codes/[recordId]/edit/page.tsx",
});

export default async function EditScSymptomCodePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-symptom-codes", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.symptom-codes.edit", scSymptomCodeFormFields);

  return (
    <AppShell topbarTitle="Edit Symptom Code">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Symptom Code</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "service-centre-symptom-codes", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
