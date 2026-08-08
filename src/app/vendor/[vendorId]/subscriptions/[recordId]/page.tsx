import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getSubscriptionsRecord, getSubscriptionsDetailFields, getSubscriptionsTimeline, subscriptionsRelated, subscriptionsColumns } from "@/lib/sample-data/subscriptions";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

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

export default function SubscriptionsDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("subscriptions");
  const record = getSubscriptionsRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("subscriptions.detail", getSubscriptionsDetailFields(record), subscriptionsColumns);
  const timeline = getSubscriptionsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("subscriptions")} topbarTitle={mod?.label ?? "Subscriptions / Membership"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/subscriptions`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Subscriptions / Membership
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={subscriptionsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Membership detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/subscriptions/${params.recordId}/edit`}
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
