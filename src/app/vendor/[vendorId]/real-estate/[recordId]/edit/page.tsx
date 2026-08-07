import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { realEstateFormFields, getRealEstateRecord } from "@/lib/sample-data/real-estate";

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

export default function EditRealEstatePage({ params }: { params: { recordId: string } }) {
  const mod = getModule("real-estate");
  const record = getRealEstateRecord(params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("real-estate")} topbarTitle={`Edit Listing — ${mod?.label ?? "Real Estate"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Listing</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={realEstateFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
