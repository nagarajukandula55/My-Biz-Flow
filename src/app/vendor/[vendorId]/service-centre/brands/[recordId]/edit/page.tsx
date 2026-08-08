import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scBrandFormFields } from "@/lib/sample-data/service-centre-brands";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.brands.edit",
  moduleSlug: "service-centre",
  title: "Device Brands — Edit",
  path: "/vendor/[vendorId]/service-centre/brands/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing brand's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/brands/[recordId]/edit/page.tsx",
});

export default async function EditScBrandPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "service-centre-brands", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.brands.edit", scBrandFormFields);

  return (
    <AppShell topbarTitle="Edit Brand">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Brand</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["name"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "service-centre-brands", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
