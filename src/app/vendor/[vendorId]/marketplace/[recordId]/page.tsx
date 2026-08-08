import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getMarketplaceDetailFields, getMarketplaceTimeline, marketplaceRelated, marketplaceColumns } from "@/lib/sample-data/marketplace";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

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

export const dynamic = "force-dynamic";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("marketplace");
  const record = await getBusinessRecord(params.vendorId, "marketplace", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("marketplace.detail", getMarketplaceDetailFields(record), marketplaceColumns);
  const timeline = getMarketplaceTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Marketplace / Vendor Aggregator"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={marketplaceRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Vendor Listing detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/marketplace`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/marketplace/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="marketplace" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
