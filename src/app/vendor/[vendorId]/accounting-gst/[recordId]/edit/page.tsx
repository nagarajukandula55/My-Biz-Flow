import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accountingGstFormFields, getAccountingGstRecord } from "@/lib/sample-data/accounting-gst";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "accounting-gst.edit",
  moduleSlug: "accounting-gst",
  title: "Accounting / GST Compliance — Edit",
  path: "/vendor/[vendorId]/accounting-gst/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing gst return's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/[recordId]/edit/page.tsx",
});

export default function EditAccountingGstPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("accounting-gst");
  const record = getAccountingGstRecord(params.recordId);
  const fields = applyCustomizations("accounting-gst.edit", accountingGstFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("accounting-gst")} topbarTitle={`Edit GST Return — ${mod?.label ?? "Accounting / GST Compliance"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit GST Return</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
