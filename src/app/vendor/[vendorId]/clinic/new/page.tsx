import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { clinicFormFields } from "@/lib/sample-data/clinic";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "clinic.create",
  moduleSlug: "clinic",
  title: "Clinic — Create",
  path: "/vendor/[vendorId]/clinic/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new appointment in the clinic module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/clinic/new/page.tsx",
});

export default async function NewClinicPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("clinic");
  const fields = await applyCustomizations("clinic.create", clinicFormFields);

  return (
    <AppShell topbarTitle={`New Appointment — ${mod?.label ?? "Clinic"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new appointment record for Clinic.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Appointment" />
        </div>
      </div>
    </AppShell>
  );
}
