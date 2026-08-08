import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { bomFormFields, getBomRecord } from "@/lib/sample-data/bom";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.bom.edit",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — Edit",
  path: "/vendor/[vendorId]/inventory/bom/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing material catalog entry's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/inventory/bom/[recordId]/edit/page.tsx",
});

export default async function EditBomPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = getBomRecord(params.recordId);
  const fields = await applyCustomizations("inventory.bom.edit", bomFormFields);

  return (
    <AppShell topbarTitle="Edit Material — Material Catalog (BOM)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Material</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
