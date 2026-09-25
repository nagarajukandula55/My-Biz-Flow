import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { wholesaleCustomerFormFields, wholesaleCustomerToRow } from "@/lib/sample-data/wholesaleCustomers";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getWholesaleCustomer } from "@/lib/wholesaleData";
import { updateWholesaleCustomerAction } from "../../actions";

registerPage({
  id: "wholesale-b2b.customers.edit",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Customers — Edit",
  path: "/partner/[partnerId]/wholesale-b2b/customers/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing WholesaleCustomer's real data.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/customers/[recordId]/edit/page.tsx",
});

export default async function EditWholesaleCustomerPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const customer = await getWholesaleCustomer(params.partnerId, params.recordId);
  if (!customer) notFound();
  const fields = await applyCustomizations("wholesale-b2b.customers.edit", wholesaleCustomerFormFields);
  const row = wholesaleCustomerToRow(customer);

  return (
    <AppShell topbarTitle="Edit Customer — Wholesale B2B">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Customer</h1>
        <p className="mt-1 text-sm text-text-muted">{customer.name}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={row}
            submitLabel="Save changes"
            action={updateWholesaleCustomerAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
