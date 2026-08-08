import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { logisticsFleetFormFields } from "@/lib/sample-data/logistics-fleet";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "logistics-fleet.edit",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Edit",
  path: "/vendor/[vendorId]/logistics-fleet/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing shipment's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/logistics-fleet/[recordId]/edit/page.tsx",
});

export default async function EditLogisticsFleetPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("logistics-fleet");
  const record = await getBusinessRecord(params.vendorId, "logistics-fleet", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("logistics-fleet.edit", logisticsFleetFormFields);

  return (
    <AppShell topbarTitle={`Edit Shipment — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Shipment</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "logistics-fleet", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
