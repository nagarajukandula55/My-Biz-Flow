import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { brandFormFields } from "@/lib/sample-data/brand";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBrandAction } from "../actions";

registerPage({
  id: "brand.create",
  moduleSlug: "brand",
  title: "Brand — Create",
  path: "/partner/[partnerId]/brand/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new Brand, Prisma-backed (createBrandAction).",
  sourceFile: "src/app/partner/[partnerId]/brand/new/page.tsx",
});

export default async function NewBrandPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("brand");
  const fields = await applyCustomizations("brand.create", brandFormFields);

  return (
    <AppShell topbarTitle={`New Brand — ${mod?.label ?? "Brand"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Brand</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new brand record.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Brand"
            action={createBrandAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
