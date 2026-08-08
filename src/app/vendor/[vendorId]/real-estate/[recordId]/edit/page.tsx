import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { realEstateFormFields } from "@/lib/sample-data/real-estate";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "real-estate.edit",
  moduleSlug: "real-estate",
  title: "Real Estate — Edit",
  path: "/vendor/[vendorId]/real-estate/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing listing's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/real-estate/[recordId]/edit/page.tsx",
});

export default async function EditRealEstatePage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("real-estate");
  const record = await getBusinessRecord(params.vendorId, "real-estate", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("real-estate.edit", realEstateFormFields);

  return (
    <AppShell topbarTitle={`Edit Listing — ${mod?.label ?? "Real Estate"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Listing</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "real-estate", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
