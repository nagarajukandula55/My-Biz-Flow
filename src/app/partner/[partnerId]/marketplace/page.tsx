import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { MarketplaceClientTable } from "./MarketplaceClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { marketplaceListingColumns, marketplaceListingToRow } from "@/lib/sample-data/marketplaceListings";
import { listMarketplaceListings } from "@/lib/marketplace";

registerPage({
  id: "marketplace.list",
  moduleSlug: "marketplace",
  title: "Marketplace — Listings",
  path: "/partner/[partnerId]/marketplace",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every MarketplaceListing (this partner's own product listings — title/description/price/stock/category/active) in a sortable table, Prisma-backed, with a \"+ New Listing\" action and row-click navigation into the record's detail view. Single-partner scoped — a partner's own catalog, not a cross-tenant marketplace.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("marketplace");
  const columns = await applyCustomizations("marketplace.list", marketplaceListingColumns);
  const listings = await listMarketplaceListings(params.partnerId);
  const rows = listings.map(marketplaceListingToRow);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Marketplace / Partner Aggregator"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/marketplace/new`} className="btn-accent">
          + New Listing
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <MarketplaceClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
