import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { hrmsFormFields, getHrmsRecord } from "@/lib/sample-data/hrms";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "hrms.edit",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Edit",
  path: "/vendor/[vendorId]/hrms/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing employee's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/hrms/[recordId]/edit/page.tsx",
});

export default async function EditHrmsPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("hrms");
  const record = getHrmsRecord(params.recordId);
  const fields = await applyCustomizations("hrms.edit", hrmsFormFields);

  return (
    <AppShell topbarTitle={`Edit Employee — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Employee</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
