import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scFaultCodeFormFields } from "@/lib/sample-data/service-centre-fault-codes";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.fault-codes.edit",
  moduleSlug: "service-centre",
  title: "Fault Codes — Edit",
  path: "/partner/[partnerId]/service-centre/fault-codes/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing fault code's data, letting a user edit and save changes.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/fault-codes/[recordId]/edit/page.tsx",
});

export default async function EditScFaultCodePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-fault-codes", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.fault-codes.edit", scFaultCodeFormFields);

  return (
    <AppShell topbarTitle="Edit Fault Code">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Fault Code</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "service-centre-fault-codes", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
