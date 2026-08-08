import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
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

export default async function EditAccountingGstPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("accounting-gst");
  const record = getAccountingGstRecord(params.recordId);
  const fields = await applyCustomizations("accounting-gst.edit", accountingGstFormFields);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "accounting-gst")} topbarTitle={`Edit GST Return — ${mod?.label ?? "Accounting / GST Compliance"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit GST Return</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
