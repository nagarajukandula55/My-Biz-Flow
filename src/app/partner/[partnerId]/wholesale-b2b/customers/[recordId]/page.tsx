import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getWholesaleCustomerDetailFields, wholesaleCustomerToRow } from "@/lib/sample-data/wholesaleCustomers";
import { getWholesaleCustomer } from "@/lib/wholesaleData";

registerPage({
  id: "wholesale-b2b.customers.detail",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Customers — Detail",
  path: "/partner/[partnerId]/wholesale-b2b/customers/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single WholesaleCustomer, rendered via the shared RecordDetail component, with an Edit action.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/customers/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WholesaleCustomerDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const customer = await getWholesaleCustomer(params.partnerId, params.recordId);
  if (!customer) notFound();
  const row = wholesaleCustomerToRow(customer);
  const fields = getWholesaleCustomerDetailFields(row);
  const recordLabel = customer.name;

  return (
    <AppShell topbarTitle="Wholesale B2B — Customers">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Customer detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/wholesale-b2b/customers`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/wholesale-b2b/customers/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
