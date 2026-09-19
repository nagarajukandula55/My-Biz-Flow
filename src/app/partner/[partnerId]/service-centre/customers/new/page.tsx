import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { customersFormFields } from "@/lib/sample-data/service-centre-customers";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.customers.create",
  moduleSlug: "service-centre",
  title: "Customers — Create",
  path: "/partner/[partnerId]/service-centre/customers/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new customer entry, built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/customers/new/page.tsx",
});

export default async function NewScCustomerPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.customers.create", "Customers");
  if (tierGate) return <AppShell topbarTitle={"New Customer"}>{tierGate}</AppShell>;

  const fields = await applyCustomizations("service-centre.customers.create", customersFormFields);

  return (
    <AppShell topbarTitle="New Customer">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Customer</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new customer entry.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Customer"
            action={(values: Record<string, unknown>) => createBusinessRecordAction(params.partnerId, "service-centre-customers", values, "service-centre/customers")}
          />
        </div>
      </div>
    </AppShell>
  );
}
