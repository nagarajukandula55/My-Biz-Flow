import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getWholesaleB2bRecord, getWholesaleB2bDetailFields, getWholesaleB2bTimeline, wholesaleB2bRelated, wholesaleB2bColumns } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "wholesale-b2b.detail",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Detail",
  path: "/vendor/[vendorId]/wholesale-b2b/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single order, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/wholesale-b2b/[recordId]/page.tsx",
});

export default function WholesaleB2bDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("wholesale-b2b");
  const record = getWholesaleB2bRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("wholesale-b2b.detail", getWholesaleB2bDetailFields(record), wholesaleB2bColumns);
  const timeline = getWholesaleB2bTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("wholesale-b2b")} topbarTitle={mod?.label ?? "Wholesale / Distributor B2B"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/wholesale-b2b`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Wholesale / Distributor B2B
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={wholesaleB2bRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/wholesale-b2b/${params.recordId}/edit`}
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
