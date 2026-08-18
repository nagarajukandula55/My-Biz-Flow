import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { gstItcFormFields } from "@/lib/sample-data/accounting-gst-itc";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "accounting-gst.itc.edit",
  moduleSlug: "accounting-gst",
  title: "GST — ITC Register — Edit",
  path: "/vendor/[vendorId]/accounting-gst/itc/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing ITC entry's data, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/itc/[recordId]/edit/page.tsx",
});

export default async function EditGstItcPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "accounting-gst-itc", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("accounting-gst.itc.edit", gstItcFormFields);

  return (
    <AppShell topbarTitle="Edit ITC Entry — GST">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit ITC Entry</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "accounting-gst-itc", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
