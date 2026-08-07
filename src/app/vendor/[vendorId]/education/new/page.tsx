import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { educationFormFields } from "@/lib/sample-data/education";

registerPage({
  id: "education.create",
  moduleSlug: "education",
  title: "Education / Coaching — Create",
  path: "/vendor/[vendorId]/education/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new enrollment in the education module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/education/new/page.tsx",
});

export default function NewEducationPage() {
  const mod = getModule("education");

  return (
    <AppShell navGroups={buildVendorNavGroups("education")} topbarTitle={`New Enrollment — ${mod?.label ?? "Education / Coaching"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Enrollment</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new enrollment record for Education / Coaching.</p>
        <div className="mt-6">
          <RecordForm fields={educationFormFields} submitLabel="Create Enrollment" />
        </div>
      </div>
    </AppShell>
  );
}
