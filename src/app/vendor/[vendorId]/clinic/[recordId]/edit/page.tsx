import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { clinicFormFields, getClinicRecord } from "@/lib/sample-data/clinic";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "clinic.edit",
  moduleSlug: "clinic",
  title: "Clinic — Edit",
  path: "/vendor/[vendorId]/clinic/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing appointment's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/clinic/[recordId]/edit/page.tsx",
});

export default async function EditClinicPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("clinic");
  const record = getClinicRecord(params.recordId);
  const fields = await applyCustomizations("clinic.edit", clinicFormFields);

  return (
    <AppShell topbarTitle={`Edit Appointment — ${mod?.label ?? "Clinic"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
