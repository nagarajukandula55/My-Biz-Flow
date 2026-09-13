import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scFaultCodeFormFields } from "@/lib/sample-data/service-centre-fault-codes";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.fault-codes.create",
  moduleSlug: "service-centre",
  title: "Fault Codes — Create",
  path: "/partner/[partnerId]/service-centre/fault-codes/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new fault code entry, built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/fault-codes/new/page.tsx",
});

export default async function NewScFaultCodePage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("service-centre.fault-codes.create", scFaultCodeFormFields);

  return (
    <AppShell topbarTitle="New Fault Code">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Fault Code</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new fault code entry.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Fault Code"
            action={createBusinessRecordAction.bind(null, params.partnerId, "service-centre-fault-codes")}
          />
        </div>
      </div>
    </AppShell>
  );
}
