import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { manufacturingFormFields } from "@/lib/sample-data/manufacturing";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "manufacturing.create",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Create",
  path: "/vendor/[vendorId]/manufacturing/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new work order in the manufacturing module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/manufacturing/new/page.tsx",
});

export default function NewManufacturingPage() {
  const mod = getModule("manufacturing");
  const fields = applyCustomizations("manufacturing.create", manufacturingFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("manufacturing")} topbarTitle={`New Work Order — ${mod?.label ?? "Manufacturing / Production"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Work Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new work order record for Manufacturing / Production.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Work Order" />
        </div>
      </div>
    </AppShell>
  );
}
