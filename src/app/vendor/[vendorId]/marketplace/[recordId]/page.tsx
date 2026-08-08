import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getMarketplaceRecord, getMarketplaceDetailFields, getMarketplaceTimeline, marketplaceRelated, marketplaceColumns } from "@/lib/sample-data/marketplace";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "marketplace.detail",
  moduleSlug: "marketplace",
  title: "Marketplace / Vendor Aggregator — Detail",
  path: "/vendor/[vendorId]/marketplace/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single vendor listing, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/marketplace/[recordId]/page.tsx",
});

export default function MarketplaceDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("marketplace");
  const record = getMarketplaceRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("marketplace.detail", getMarketplaceDetailFields(record), marketplaceColumns);
  const timeline = getMarketplaceTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("marketplace")} topbarTitle={mod?.label ?? "Marketplace / Vendor Aggregator"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/marketplace`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Marketplace / Vendor Aggregator
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={marketplaceRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Vendor Listing detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/marketplace/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <ConfirmDeleteDialog recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
