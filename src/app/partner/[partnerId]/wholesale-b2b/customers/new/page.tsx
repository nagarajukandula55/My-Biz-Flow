import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { wholesaleCustomerFormFields } from "@/lib/sample-data/wholesaleCustomers";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createWholesaleCustomerAction } from "../actions";

registerPage({
  id: "wholesale-b2b.customers.create",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Customers — Create",
  path: "/partner/[partnerId]/wholesale-b2b/customers/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "Creation form for a new WholesaleCustomer (dealer/distributor account), Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/customers/new/page.tsx",
});

export default async function NewWholesaleCustomerPage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("wholesale-b2b.customers.create", wholesaleCustomerFormFields);

  return (
    <AppShell topbarTitle="New Customer — Wholesale B2B">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Customer</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new dealer/distributor account.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Customer"
            action={createWholesaleCustomerAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
