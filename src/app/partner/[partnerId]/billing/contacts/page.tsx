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
  path: "/partner/[partnerId]/billing/contacts",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every customer/partner Contact used by Billing invoices, credit notes and payments, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/billing/contacts/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingContactsPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("billing.contacts.list", billingContactColumns);
  const rows = await listBusinessRecords(params.partnerId, "billing-contacts");

  return (
    <AppShell
      topbarTitle="Contacts"
      topbarActions={<ContactsNewButton partnerId={params.partnerId} />}
    >
      <div>
        <div className="mt-2">
          <ContactsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
