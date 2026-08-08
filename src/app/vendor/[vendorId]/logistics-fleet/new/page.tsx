import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { logisticsFleetFormFields } from "@/lib/sample-data/logistics-fleet";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "logistics-fleet.create",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Create",
  path: "/vendor/[vendorId]/logistics-fleet/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new shipment in the logistics-fleet module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/logistics-fleet/new/page.tsx",
});

export default async function NewLogisticsFleetPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("logistics-fleet");
  const fields = await applyCustomizations("logistics-fleet.create", logisticsFleetFormFields);

  return (
    <AppShell topbarTitle={`New Shipment — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Shipment</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new shipment record for Logistics / Fleet.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Shipment" />
        </div>
      </div>
    </AppShell>
  );
}
