import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getLoyaltyRewardsDetailFields, getLoyaltyRewardsTimeline, loyaltyRewardsRelated, loyaltyRewardsColumns } from "@/lib/sample-data/loyalty-rewards";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getLoyaltyMember, listPointsLedger } from "@/lib/loyaltyRewards";
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
  explanation: "Read-only detail view of a single LoyaltyMember, rendered via the shared RecordDetail component (field grid + activity timeline), with an Edit action in the header. The LoyaltyLifecycle panel above it carries the real domain logic, now Prisma-backed by LoyaltyMember + PointsLedgerEntry: a points engine (earn % of a linked purchase, redeem with a fail-closed insufficient-balance check), a tier derived from real lifetime-points thresholds, and a running earn/redeem PointsLedgerEntry history.",
  sourceFile: "src/app/partner/[partnerId]/loyalty-rewards/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LoyaltyRewardsDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("loyalty-rewards");
  const record = await getLoyaltyMember(params.partnerId, params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("loyalty-rewards.detail", getLoyaltyRewardsDetailFields(record), loyaltyRewardsColumns);
  const timeline = getLoyaltyRewardsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const transactions = await listPointsLedger(params.partnerId, params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Loyalty & Rewards"}>
      <div>
        <LoyaltyLifecycle
          partnerId={params.partnerId}
          loyaltyId={params.recordId}
          initialPointsBalance={Number(record["pointsBalance"] ?? 0)}
          initialLifetimePointsEarned={Number(record["lifetimePointsEarned"] ?? 0)}
          initialTransactions={transactions}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
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
