import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getMarketplaceOrderDetailFields, marketplaceOrderToRow } from "@/lib/sample-data/marketplaceOrders";
import { getMarketplaceOrder } from "@/lib/marketplace";
import { MarketplaceOrderActions } from "./MarketplaceOrderActions";

registerPage({
  id: "marketplace.orders.detail",
  moduleSlug: "marketplace",
  title: "Marketplace — Orders — Detail",
  path: "/partner/[partnerId]/marketplace/orders/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single MarketplaceOrder (field grid via RecordDetail) plus a status-advance panel (Pending -> Confirmed -> Shipped -> Delivered, or Cancelled from any non-final state). Confirming an order decrements the listing's stock, fail-closed and inside a transaction.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/orders/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplaceOrderDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const order = await getMarketplaceOrder(params.partnerId, params.recordId);
  if (!order) notFound();
  const row = marketplaceOrderToRow(order);
  const fields = getMarketplaceOrderDetailFields(row);
  const recordLabel = `${order.listingTitle} — ${order.customerName}`;

  return (
    <AppShell topbarTitle="Marketplace — Orders">
      <div>
        <MarketplaceOrderActions partnerId={params.partnerId} orderId={order.id} status={order.status} />

        <div className="mt-8">
          <RecordDetail
            fields={fields}
            recordLabel={recordLabel}
            searchParams={searchParams}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Order detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/partner/${params.partnerId}/marketplace/orders`} className="btn-outline">
                    &larr; Back
                  </Link>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
