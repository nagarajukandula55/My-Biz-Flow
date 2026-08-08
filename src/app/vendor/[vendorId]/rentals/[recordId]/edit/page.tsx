import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { rentalsFormFields, getRentalsRecord } from "@/lib/sample-data/rentals";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "rentals.edit",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Edit",
  path: "/vendor/[vendorId]/rentals/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing booking's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/rentals/[recordId]/edit/page.tsx",
});

export default async function EditRentalsPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("rentals");
  const record = getRentalsRecord(params.recordId);
  const fields = await applyCustomizations("rentals.edit", rentalsFormFields);

  return (
    <AppShell topbarTitle={`Edit Booking — ${mod?.label ?? "Rentals / Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Booking</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
