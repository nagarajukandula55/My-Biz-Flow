import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { solutionsFormFields } from "@/lib/sample-data/solutions";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.solutions.create",
  moduleSlug: "service-centre",
  title: "Solutions — Create",
  path: "/vendor/[vendorId]/service-centre/solutions/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new solution, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/solutions/new/page.tsx",
});

export default async function NewSolutionPage() {
  const fields = await applyCustomizations("service-centre.solutions.create", solutionsFormFields);

  return (
    <AppShell topbarTitle="New Solution">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Solution</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new solution entry.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Solution" />
        </div>
      </div>
    </AppShell>
  );
}
