import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { returnOrderFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.return-orders.create",
  moduleSlug: "inventory",
  title: "Return Orders — Create",
  path: "/vendor/[vendorId]/inventory/return-orders/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new return order (defective/good material back to the mapped warehouse), built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/return-orders/new/page.tsx",
});

export default async function NewReturnOrdersPage() {
  const fields = await applyCustomizations("inventory.return-orders.create", returnOrderFormFields);

  return (
    <AppShell topbarTitle="New Return Order — Return Orders">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Return Order</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new return order record.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Return Order" />
        </div>
      </div>
    </AppShell>
  );
}
