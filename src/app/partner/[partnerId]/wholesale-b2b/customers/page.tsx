import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { WholesaleCustomersClientTable } from "./WholesaleCustomersClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { wholesaleCustomerColumns, wholesaleCustomerToRow } from "@/lib/sample-data/wholesaleCustomers";
import { listWholesaleCustomers } from "@/lib/wholesaleData";

registerPage({
  id: "wholesale-b2b.customers.list",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Customers",
  path: "/partner/[partnerId]/wholesale-b2b/customers",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every WholesaleCustomer (dealer/distributor account) for this partner — name, contact, GSTIN, credit limit/term, active flag — Prisma-backed, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/customers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WholesaleCustomersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("wholesale-b2b.customers.list", wholesaleCustomerColumns);
  const customers = await listWholesaleCustomers(params.partnerId);
  const rows = customers.map(wholesaleCustomerToRow);

  return (
    <AppShell
      topbarTitle="Wholesale B2B — Customers"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/wholesale-b2b/customers/new`} className="btn-accent">
          + New Customer
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Dealer/distributor accounts, credit limits and terms for Wholesale B2B.</p>
        <div className="mt-6">
          <WholesaleCustomersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
