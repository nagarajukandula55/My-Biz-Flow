import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { posFormFields, getPosRecord } from "@/lib/sample-data/pos";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "pos.edit",
  moduleSlug: "pos",
  title: "POS — Edit",
  path: "/vendor/[vendorId]/pos/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing sale's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/pos/[recordId]/edit/page.tsx",
});

export default function EditPosPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("pos");
  const record = getPosRecord(params.recordId);
  const fields = applyCustomizations("pos.edit", posFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("pos")} topbarTitle={`Edit Sale — ${mod?.label ?? "POS"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Sale</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
