import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ContactsClientTable } from "./ContactsClientTable";
import { ContactsNewButton } from "./ContactsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingContactColumns } from "@/lib/sample-data/billing-contacts";
import { listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

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

export default async function BillingContactsPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const columns = await applyCustomizations("billing.contacts.list", billingContactColumns);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { rows, total, totalPages, pageSize } = await listBusinessRecordsPaginated(params.partnerId, "billing-contacts", { page });

  return (
    <AppShell
      topbarTitle="Contacts"
      topbarActions={<ContactsNewButton partnerId={params.partnerId} />}
    >
      <div>
        <div className="mt-2">
          <ContactsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          buildHref={(p) => buildPageQueryString(searchParams, { page: String(p) })}
        />
      </div>
    </AppShell>
  );
}
