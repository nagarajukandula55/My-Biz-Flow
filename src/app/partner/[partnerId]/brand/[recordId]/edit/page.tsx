import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { brandFormFields, brandToRow } from "@/lib/sample-data/brand";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBrand } from "@/lib/brandData";
import { updateBrandAction } from "../../actions";

registerPage({
  id: "brand.edit",
  moduleSlug: "brand",
  title: "Brand — Edit",
  path: "/partner/[partnerId]/brand/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Brand's real data (Prisma-backed).",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/edit/page.tsx",
});

export default async function EditBrandPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("brand");
  const brand = await getBrand(params.partnerId, params.recordId);
  if (!brand) notFound();
  const fields = await applyCustomizations("brand.edit", brandFormFields);
  const row = brandToRow(brand);

  return (
    <AppShell topbarTitle={`Edit Brand — ${mod?.label ?? "Brand"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Brand</h1>
        <p className="mt-1 text-sm text-text-muted">{brand.name}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={row}
            submitLabel="Save changes"
            action={updateBrandAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
