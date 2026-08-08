import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getLoyaltyRewardsRecord, getLoyaltyRewardsDetailFields, getLoyaltyRewardsTimeline, loyaltyRewardsRelated, loyaltyRewardsColumns } from "@/lib/sample-data/loyalty-rewards";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "loyalty-rewards.detail",
  moduleSlug: "loyalty-rewards",
  title: "Loyalty & Rewards — Detail",
  path: "/vendor/[vendorId]/loyalty-rewards/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single member, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/loyalty-rewards/[recordId]/page.tsx",
});

export default async function LoyaltyRewardsDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("loyalty-rewards");
  const record = getLoyaltyRewardsRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("loyalty-rewards.detail", getLoyaltyRewardsDetailFields(record), loyaltyRewardsColumns);
  const timeline = getLoyaltyRewardsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={await buildVendorNavGroups("loyalty-rewards")} topbarTitle={mod?.label ?? "Loyalty & Rewards"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/loyalty-rewards`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Loyalty & Rewards
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={loyaltyRewardsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Member detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/loyalty-rewards/${params.recordId}/edit`}
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
