import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { billingItemFormFields } from "@/lib/sample-data/billing-items";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.items.create",
  moduleSlug: "billing",
  title: "Billing — Items — Create",
  path: "/vendor/[vendorId]/billing/items/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new Billing catalog Item/Service, built via the shared RecordForm component. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/items/new/page.tsx",
});

export default async function NewBillingItemPage({ params }: { params: { vendorId: string } }) {
  const fields = await applyCustomizations("billing.items.create", billingItemFormFields);

  return (
    <AppShell topbarTitle="New Item — Billing">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Item</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new item or service for the Billing catalog.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Item"
            action={createBusinessRecordAction.bind(null, params.vendorId, "billing-items")}
          />
        </div>
      </div>
    </AppShell>
  );
}
