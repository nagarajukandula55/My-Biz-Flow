import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { marketplaceOrderColumns, marketplaceOrderToRow } from "@/lib/sample-data/marketplaceOrders";
import { applyCustomizations } from "@/lib/designer/customizations";
import { listMarketplaceOrders } from "@/lib/marketplace";
import { MarketplaceOrdersClientTable } from "./MarketplaceOrdersClientTable";

registerPage({
  id: "marketplace.orders.list",
  moduleSlug: "marketplace",
  title: "Marketplace — Orders",
  path: "/partner/[partnerId]/marketplace/orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every MarketplaceOrder placed against this partner's own listings — listing, customer, quantity, total amount, status. Prisma-backed, with a \"+ New Order\" action and row-click navigation into the order's detail/status page.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/orders/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplaceOrdersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("marketplace.orders.list", marketplaceOrderColumns);
  const orders = await listMarketplaceOrders(params.partnerId);
  const rows = orders.map(marketplaceOrderToRow);

  return (
    <AppShell
      topbarTitle="Marketplace — Orders"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/marketplace/orders/new`} className="btn-accent">
          + New Order
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Orders placed against your own Marketplace listings.</p>
        <div className="mt-6">
          <MarketplaceOrdersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
