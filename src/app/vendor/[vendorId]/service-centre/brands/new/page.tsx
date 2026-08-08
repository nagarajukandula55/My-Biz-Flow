import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scBrandFormFields } from "@/lib/sample-data/service-centre-brands";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.brands.create",
  moduleSlug: "service-centre",
  title: "Device Brands — Create",
  path: "/vendor/[vendorId]/service-centre/brands/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new brand entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/brands/new/page.tsx",
});

export default async function NewScBrandPage() {
  const fields = await applyCustomizations("service-centre.brands.create", scBrandFormFields);

  return (
    <AppShell topbarTitle="New Brand">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Brand</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new brand entry.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Brand" />
        </div>
      </div>
    </AppShell>
  );
}
