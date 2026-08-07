import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
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

export default function EditManufacturingPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("manufacturing");
  const record = getManufacturingRecord(params.recordId);
  const fields = applyCustomizations("manufacturing.edit", manufacturingFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("manufacturing")} topbarTitle={`Edit Work Order — ${mod?.label ?? "Manufacturing / Production"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Work Order</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
