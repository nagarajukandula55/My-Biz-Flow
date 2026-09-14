import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { bomFormFields } from "@/lib/sample-data/bom";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createServiceCentreBomMaterialAction } from "@/lib/serviceCentreCatalogActions";

registerPage({
  id: "inventory.bom.create",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — Create",
  path: "/partner/[partnerId]/inventory/bom/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new material catalog entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/partner/[partnerId]/inventory/bom/new/page.tsx",
});

export default async function NewBomPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "inventory.bom.create", "Material Catalog (BOM)");
  if (tierGate) return <AppShell topbarTitle={"New Material"}>{tierGate}</AppShell>;

  const fields = await applyCustomizations("inventory.bom.create", bomFormFields);

  return (
    <AppShell topbarTitle="New Material — Material Catalog (BOM)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Material</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new material record.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Material"
            action={createServiceCentreBomMaterialAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
