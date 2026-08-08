import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { stockAdjustmentFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.stock-adjustments.create",
  moduleSlug: "inventory",
  title: "Stock Adjustments — Create",
  path: "/vendor/[vendorId]/inventory/stock-adjustments/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new stock adjustment log entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/stock-adjustments/new/page.tsx",
});

export default async function NewStockAdjustmentsPage() {
  const fields = await applyCustomizations("inventory.stock-adjustments.create", stockAdjustmentFormFields);

  return (
    <AppShell topbarTitle="New Adjustment — Stock Adjustments">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Adjustment</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new adjustment record.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Adjustment" />
        </div>
      </div>
    </AppShell>
  );
}
