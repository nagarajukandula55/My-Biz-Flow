import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { warehouseFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "inventory.warehouses.edit",
  moduleSlug: "inventory",
  title: "Warehouses — Edit",
  path: "/vendor/[vendorId]/inventory/warehouses/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing warehouse's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/inventory/warehouses/[recordId]/edit/page.tsx",
});

export default async function EditWarehousesPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "inventory-warehouses", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("inventory.warehouses.edit", warehouseFormFields);

  return (
    <AppShell topbarTitle="Edit Warehouse — Warehouses">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Warehouse</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "inventory-warehouses", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
