import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getMarketplaceListingDetailFields, marketplaceListingToRow } from "@/lib/sample-data/marketplaceListings";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getMarketplaceListing } from "@/lib/marketplace";
import { marketplaceListingColumns } from "@/lib/sample-data/marketplaceListings";

registerPage({
  id: "marketplace.detail",
  moduleSlug: "marketplace",
  title: "Marketplace — Listings — Detail",
  path: "/partner/[partnerId]/marketplace/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single MarketplaceListing, rendered via the shared RecordDetail component, with Edit action. Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplaceDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("marketplace");
  const listing = await getMarketplaceListing(params.partnerId, params.recordId);
  if (!listing) notFound();
  const row = marketplaceListingToRow(listing);
  const fields = await applyCustomizationsToDetailFields("marketplace.detail", getMarketplaceListingDetailFields(row), marketplaceListingColumns);
  const recordLabel = listing.title;

  return (
    <AppShell topbarTitle={mod?.label ?? "Marketplace / Partner Aggregator"}>
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Listing detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/marketplace`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/marketplace/${params.recordId}/edit`}
                  className="btn-outline"
                >
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
