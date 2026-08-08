import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.create",
  moduleSlug: "service-centre",
  title: "Service Centre — Create",
  path: "/vendor/[vendorId]/service-centre/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new workorder in the service-centre module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/new/page.tsx",
});

export default async function NewServiceCentrePage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("service-centre");
  const fields = await applyCustomizations("service-centre.create", serviceCentreFormFields);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "service-centre")} topbarTitle={`New Workorder — ${mod?.label ?? "Service Centre"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Workorder</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new workorder record for Service Centre.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Workorder" />
        </div>
      </div>
    </AppShell>
  );
}
