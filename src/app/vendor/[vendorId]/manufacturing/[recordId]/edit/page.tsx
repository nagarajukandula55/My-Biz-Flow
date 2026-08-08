import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { manufacturingFormFields, getManufacturingRecord } from "@/lib/sample-data/manufacturing";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "manufacturing.edit",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Edit",
  path: "/vendor/[vendorId]/manufacturing/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing work order's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/manufacturing/[recordId]/edit/page.tsx",
});

export default async function EditManufacturingPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("manufacturing");
  const record = getManufacturingRecord(params.recordId);
  const fields = await applyCustomizations("manufacturing.edit", manufacturingFormFields);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "manufacturing")} topbarTitle={`Edit Work Order — ${mod?.label ?? "Manufacturing / Production"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Work Order</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
