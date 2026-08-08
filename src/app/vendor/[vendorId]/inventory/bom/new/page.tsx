import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { bomFormFields } from "@/lib/sample-data/bom";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.bom.create",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — Create",
  path: "/vendor/[vendorId]/inventory/bom/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new material catalog entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/bom/new/page.tsx",
});

export default async function NewBomPage() {
  const fields = await applyCustomizations("inventory.bom.create", bomFormFields);

  return (
    <AppShell topbarTitle="New Material — Material Catalog (BOM)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Material</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new material record.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Material" />
        </div>
      </div>
    </AppShell>
  );
}
