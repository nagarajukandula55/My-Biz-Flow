import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { educationFormFields, getEducationRecord } from "@/lib/sample-data/education";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "education.edit",
  moduleSlug: "education",
  title: "Education / Coaching — Edit",
  path: "/vendor/[vendorId]/education/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing enrollment's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/education/[recordId]/edit/page.tsx",
});

export default async function EditEducationPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("education");
  const record = getEducationRecord(params.recordId);
  const fields = await applyCustomizations("education.edit", educationFormFields);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "education")} topbarTitle={`Edit Enrollment — ${mod?.label ?? "Education / Coaching"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Enrollment</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
