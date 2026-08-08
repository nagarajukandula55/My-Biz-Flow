import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { brandFormFields } from "@/lib/sample-data/brand";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "brand.create",
  moduleSlug: "brand",
  title: "Brand — Create",
  path: "/vendor/[vendorId]/brand/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new location in the brand module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/brand/new/page.tsx",
});

export default async function NewBrandPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("brand");
  const fields = await applyCustomizations("brand.create", brandFormFields);

  return (
    <AppShell topbarTitle={`New Location — ${mod?.label ?? "Brand"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Location</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new location record for Brand.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Location" />
        </div>
      </div>
    </AppShell>
  );
}
