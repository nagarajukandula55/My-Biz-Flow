import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getSubscriptionsDetailFields, getSubscriptionsTimeline, subscriptionsRelated, subscriptionsColumns } from "@/lib/sample-data/subscriptions";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "subscriptions.detail",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Detail",
  path: "/vendor/[vendorId]/subscriptions/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single membership, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/subscriptions/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SubscriptionsDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("subscriptions");
  const record = await getBusinessRecord(params.vendorId, "subscriptions", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("subscriptions.detail", getSubscriptionsDetailFields(record), subscriptionsColumns);
  const timeline = getSubscriptionsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Subscriptions / Membership"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={subscriptionsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Membership detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/subscriptions`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/subscriptions/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="subscriptions" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
