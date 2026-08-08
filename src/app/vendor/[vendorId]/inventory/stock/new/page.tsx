import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { stockFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.stock.create",
  moduleSlug: "inventory",
  title: "Inventory (Stock) — Create",
  path: "/vendor/[vendorId]/inventory/stock/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new per-warehouse stock ledger entry, built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/stock/new/page.tsx",
});

export default async function NewStockPage() {
  const fields = await applyCustomizations("inventory.stock.create", stockFormFields);

  return (
    <AppShell topbarTitle="New Stock Entry — Inventory (Stock)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Stock Entry</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new stock entry record.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Stock Entry" />
        </div>
      </div>
    </AppShell>
  );
}
