import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ContactsClientTable } from "./ContactsClientTable";
import { ContactsNewButton } from "./ContactsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingContactColumns } from "@/lib/sample-data/billing-contacts";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.contacts.list",
  moduleSlug: "billing",
  title: "Billing — Contacts",
  path: "/vendor/[vendorId]/billing/contacts",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every customer/vendor Contact used by Billing invoices, credit notes and payments, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/billing/contacts/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingContactsPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("billing.contacts.list", billingContactColumns);
  const rows = await listBusinessRecords(params.vendorId, "billing-contacts");

  return (
    <AppShell
      topbarTitle="Contacts"
      topbarActions={<ContactsNewButton vendorId={params.vendorId} />}
    >
      <div>
        <div className="mt-2">
          <ContactsClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
