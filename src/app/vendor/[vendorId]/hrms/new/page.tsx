import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { hrmsFormFields } from "@/lib/sample-data/hrms";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "hrms.create",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Create",
  path: "/vendor/[vendorId]/hrms/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new employee in the hrms module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/hrms/new/page.tsx",
});

export default function NewHrmsPage() {
  const mod = getModule("hrms");
  const fields = applyCustomizations("hrms.create", hrmsFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("hrms")} topbarTitle={`New Employee — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Employee</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new employee record for HRMS / Payroll.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Employee" />
        </div>
      </div>
    </AppShell>
  );
}
