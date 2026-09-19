import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { getStockTakeFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createStockTakeAction } from "../actions";

registerPage({
  id: "inventory.stock-take.create",
  moduleSlug: "inventory",
  title: "Stock Take — Create",
  path: "/partner/[partnerId]/inventory/stock-take/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for logging a new stock take count, built via the shared RecordForm component. Variance is computed server-side from Expected Qty and Counted Qty, never typed directly.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-take/new/page.tsx",
});

export default async function NewStockTakePage({ params }: { params: { partnerId: string } }) {
  const formFields = await getStockTakeFormFields(params.partnerId);
  const fields = await applyCustomizations("inventory.stock-take.create", formFields);

  return (
    <AppShell topbarTitle="New Stock Take">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Stock Take</h1>
        <p className="mt-1 text-xs text-text-muted">Log a physical count against the system's expected quantity.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Save Count"
            action={createStockTakeAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
