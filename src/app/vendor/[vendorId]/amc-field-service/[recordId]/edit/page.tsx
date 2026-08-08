import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { amcFieldServiceFormFields, getAmcFieldServiceRecord } from "@/lib/sample-data/amc-field-service";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "amc-field-service.edit",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — Edit",
  path: "/vendor/[vendorId]/amc-field-service/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing contract's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/amc-field-service/[recordId]/edit/page.tsx",
});

export default async function EditAmcFieldServicePage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("amc-field-service");
  const record = getAmcFieldServiceRecord(params.recordId);
  const fields = await applyCustomizations("amc-field-service.edit", amcFieldServiceFormFields);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "amc-field-service")} topbarTitle={`Edit Contract — ${mod?.label ?? "AMC / Field Service"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Contract</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
