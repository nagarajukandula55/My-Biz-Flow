import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { stockTransferFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createStockTransferAction } from "../actions";

registerPage({
  id: "inventory.stock-transfers.create",
  moduleSlug: "inventory",
  title: "Stock Transfers — Create",
  path: "/partner/[partnerId]/inventory/stock-transfers/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new stock transfer, built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-transfers/new/page.tsx",
});

export default async function NewStockTransferPage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("inventory.stock-transfers.create", stockTransferFormFields);

  return (
    <AppShell topbarTitle="New Transfer — Stock Transfers">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Transfer</h1>
        <p className="mt-1 text-xs text-text-muted">
          Move material between two of this partner's warehouses, or request a transfer to another onboarded
          partner (requires Super Admin approval).
        </p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Transfer"
            action={createStockTransferAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
