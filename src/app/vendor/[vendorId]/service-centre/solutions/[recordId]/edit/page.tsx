import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { solutionsFormFields, getSolutionRecord } from "@/lib/sample-data/solutions";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.solutions.edit",
  moduleSlug: "service-centre",
  title: "Solutions — Edit",
  path: "/vendor/[vendorId]/service-centre/solutions/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing solution's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/solutions/[recordId]/edit/page.tsx",
});

export default async function EditSolutionPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = getSolutionRecord(params.recordId);
  const fields = await applyCustomizations("service-centre.solutions.edit", solutionsFormFields);

  return (
    <AppShell topbarTitle="Edit Solution">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Solution</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["title"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
