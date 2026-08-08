import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecordForm } from "@/components/RecordForm";
import { posFormFields } from "@/lib/sample-data/pos";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

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
  explanation: "The same config-driven RecordForm pre-populated with an existing sale's real data, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/pos/[recordId]/edit/page.tsx",
});

export default async function EditPosPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("pos");
  const record = await getBusinessRecord(params.vendorId, "pos", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("pos.edit", posFormFields);

  return (
    <AppShell topbarTitle={`Edit Sale — ${mod?.label ?? "POS"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Sale</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "pos", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
