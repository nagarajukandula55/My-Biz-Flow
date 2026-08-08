import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accountingGstFormFields } from "@/lib/sample-data/accounting-gst";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "accounting-gst.create",
  moduleSlug: "accounting-gst",
  title: "Accounting / GST Compliance — Create",
  path: "/vendor/[vendorId]/accounting-gst/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new gst return in the accounting-gst module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/new/page.tsx",
});

export default async function NewAccountingGstPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("accounting-gst");
  const fields = await applyCustomizations("accounting-gst.create", accountingGstFormFields);

  return (
    <AppShell topbarTitle={`New GST Return — ${mod?.label ?? "Accounting / GST Compliance"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New GST Return</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new gst return record for Accounting / GST Compliance.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create GST Return" />
        </div>
      </div>
    </AppShell>
  );
}
