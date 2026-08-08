import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getWholesaleB2bDetailFields, getWholesaleB2bTimeline, wholesaleB2bRelated, wholesaleB2bColumns } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

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

export const dynamic = "force-dynamic";

export default async function WholesaleB2bDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("wholesale-b2b");
  const record = await getBusinessRecord(params.vendorId, "wholesale-b2b", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("wholesale-b2b.detail", getWholesaleB2bDetailFields(record), wholesaleB2bColumns);
  const timeline = getWholesaleB2bTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Wholesale / Distributor B2B"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={wholesaleB2bRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/wholesale-b2b`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/wholesale-b2b/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="wholesale-b2b" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
