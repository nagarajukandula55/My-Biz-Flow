import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getLoyaltyRewardsDetailFields, getLoyaltyRewardsTimeline, loyaltyRewardsRelated, loyaltyRewardsColumns, extractLoyaltyLifecycleFromRecord } from "@/lib/sample-data/loyalty-rewards";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { LoyaltyLifecycle } from "./LoyaltyLifecycle";

registerPage({
  id: "loyalty-rewards.detail",
  moduleSlug: "loyalty-rewards",
  title: "Loyalty & Rewards — Detail",
  path: "/partner/[partnerId]/loyalty-rewards/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single member, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The LoyaltyLifecycle panel above it carries the real domain logic: a points engine (earn % of a linked purchase, redeem with a fail-closed insufficient-balance check), a tier derived from real lifetime-points thresholds, and a running earn/redeem transaction ledger.",
  sourceFile: "src/app/partner/[partnerId]/loyalty-rewards/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LoyaltyRewardsDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("loyalty-rewards");
  const record = await getBusinessRecord(params.partnerId, "loyalty-rewards", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("loyalty-rewards.detail", getLoyaltyRewardsDetailFields(record), loyaltyRewardsColumns);
  const timeline = getLoyaltyRewardsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractLoyaltyLifecycleFromRecord(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "Loyalty & Rewards"}>
      <div>
        <LoyaltyLifecycle
          partnerId={params.partnerId}
          loyaltyId={recordLabel}
          initialPointsBalance={lifecycle.pointsBalance}
          initialLifetimePointsEarned={lifecycle.lifetimePointsEarned}
          initialTransactions={lifecycle.transactions}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={loyaltyRewardsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Member detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/loyalty-rewards`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/loyalty-rewards/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="loyalty-rewards" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
