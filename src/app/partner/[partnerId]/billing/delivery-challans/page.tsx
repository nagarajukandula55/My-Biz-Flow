import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { DeliveryChallansClientTable } from "./DeliveryChallansClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { deliveryChallanColumns } from "@/lib/sample-data/billing-sales-documents";
import { listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

registerPage({
  id: "billing.delivery-challans.list",
  moduleSlug: "billing",
  title: "Billing — Delivery Challans",
  path: "/partner/[partnerId]/billing/delivery-challans",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Delivery Challan — goods moved to a contact without billing them (job work, supply on approval, line sales) — with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/billing/delivery-challans/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function DeliveryChallansPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "billing.delivery-challans.list", "Delivery Challans");
  if (tierGate) return <AppShell topbarTitle={"Delivery Challans"}>{tierGate}</AppShell>;

  const columns = await applyCustomizations("billing.delivery-challans.list", deliveryChallanColumns);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { rows, total, totalPages, pageSize } = await listBusinessRecordsPaginated(params.partnerId, "billing-delivery-challans", { page });

  return (
    <AppShell
      topbarTitle="Delivery Challans"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/billing/delivery-challans/new`} className="btn-accent">
          + New Delivery Challan
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <DeliveryChallansClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
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
