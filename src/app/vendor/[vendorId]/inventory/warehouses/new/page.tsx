import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { warehouseFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "inventory.warehouses.create",
  moduleSlug: "inventory",
  title: "Warehouses — Create",
  path: "/vendor/[vendorId]/inventory/warehouses/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new warehouse, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/warehouses/new/page.tsx",
});

export default async function NewWarehousesPage({ params }: { params: { vendorId: string } }) {
  const fields = await applyCustomizations("inventory.warehouses.create", warehouseFormFields);

  return (
    <AppShell topbarTitle="New Warehouse — Warehouses">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Warehouse</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new warehouse record.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Warehouse"
            action={createBusinessRecordAction.bind(null, params.vendorId, "inventory-warehouses")}
          />
        </div>
      </div>
    </AppShell>
  );
}
