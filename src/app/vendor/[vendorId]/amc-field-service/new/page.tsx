import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { amcFieldServiceFormFields } from "@/lib/sample-data/amc-field-service";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "amc-field-service.create",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — Create",
  path: "/vendor/[vendorId]/amc-field-service/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new contract in the amc-field-service module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/amc-field-service/new/page.tsx",
});

export default async function NewAmcFieldServicePage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("amc-field-service");
  const fields = await applyCustomizations("amc-field-service.create", amcFieldServiceFormFields);

  return (
    <AppShell topbarTitle={`New Contract — ${mod?.label ?? "AMC / Field Service"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Contract</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new contract record for AMC / Field Service.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Contract" />
        </div>
      </div>
    </AppShell>
  );
}
