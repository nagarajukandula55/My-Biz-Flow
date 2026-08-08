import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { legalFormFields, getLegalRecord } from "@/lib/sample-data/legal";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "legal.edit",
  moduleSlug: "legal",
  title: "Legal / Case Management — Edit",
  path: "/vendor/[vendorId]/legal/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing matter's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/legal/[recordId]/edit/page.tsx",
});

export default async function EditLegalPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("legal");
  const record = getLegalRecord(params.recordId);
  const fields = await applyCustomizations("legal.edit", legalFormFields);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "legal")} topbarTitle={`Edit Matter — ${mod?.label ?? "Legal / Case Management"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Matter</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
