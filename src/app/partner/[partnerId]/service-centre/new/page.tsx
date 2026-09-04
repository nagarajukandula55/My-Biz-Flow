import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.create",
  moduleSlug: "service-centre",
  title: "Service Centre — Create",
  path: "/partner/[partnerId]/service-centre/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new workorder in the service-centre module, built from the module's real field set via the shared RecordForm component. Real persistence (BusinessRecord, Prisma-backed) — Brand/Model/Technician are assigned afterward from the workorder's detail page (WorkorderLifecycle), not at intake, since a device isn't always in the catalog yet.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/new/page.tsx",
});

export default async function NewServiceCentrePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("service-centre");
  const fields = await applyCustomizations("service-centre.create", serviceCentreFormFields);

  return (
    <AppShell topbarTitle={`New Workorder — ${mod?.label ?? "Service Centre"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Workorder</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new workorder record for Service Centre.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Workorder"
            action={createBusinessRecordAction.bind(null, params.partnerId, "service-centre")}
          />
        </div>
      </div>
    </AppShell>
  );
}
