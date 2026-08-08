import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { brandFormFields, getBrandRecord } from "@/lib/sample-data/brand";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "brand.edit",
  moduleSlug: "brand",
  title: "Brand — Edit",
  path: "/vendor/[vendorId]/brand/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing location's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/brand/[recordId]/edit/page.tsx",
});

export default function EditBrandPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("brand");
  const record = getBrandRecord(params.recordId);
  const fields = applyCustomizations("brand.edit", brandFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("brand")} topbarTitle={`Edit Location — ${mod?.label ?? "Brand"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Location</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
