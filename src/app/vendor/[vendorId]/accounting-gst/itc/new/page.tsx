import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { gstItcFormFields } from "@/lib/sample-data/accounting-gst-itc";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "accounting-gst.itc.create",
  moduleSlug: "accounting-gst",
  title: "GST — ITC Register — Create",
  path: "/vendor/[vendorId]/accounting-gst/itc/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new ITC entry, built via the shared RecordForm component. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/itc/new/page.tsx",
});

export default async function NewGstItcPage({ params }: { params: { vendorId: string } }) {
  const fields = await applyCustomizations("accounting-gst.itc.create", gstItcFormFields);

  return (
    <AppShell topbarTitle="New ITC Entry — GST">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New ITC Entry</h1>
        <p className="mt-1 text-xs text-text-muted">Record an Input Tax Credit entry from a vendor bill.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Record Entry"
            action={createBusinessRecordAction.bind(null, params.vendorId, "accounting-gst-itc")}
          />
        </div>
      </div>
    </AppShell>
  );
}
