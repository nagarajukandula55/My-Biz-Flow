import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { partOrderFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.part-orders.create",
  moduleSlug: "inventory",
  title: "Part Orders — Create",
  path: "/vendor/[vendorId]/inventory/part-orders/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new part order (warehouse dispatching replacement material), built via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/part-orders/new/page.tsx",
});

export default async function NewPartOrdersPage() {
  const fields = await applyCustomizations("inventory.part-orders.create", partOrderFormFields);

  return (
    <AppShell topbarTitle="New Part Order — Part Orders">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Part Order</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new part order record.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Part Order" />
        </div>
      </div>
    </AppShell>
  );
}
