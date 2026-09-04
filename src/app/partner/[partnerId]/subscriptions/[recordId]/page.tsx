import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getSubscriptionsDetailFields, getSubscriptionsTimeline, subscriptionsRelated, subscriptionsColumns, extractMembershipFromRecord } from "@/lib/sample-data/subscriptions";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { MembershipActionsPanel } from "./MembershipActionsPanel";

registerPage({
  id: "subscriptions.detail",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Detail",
  path: "/partner/[partnerId]/subscriptions/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Detail view of a single membership: a real billing panel (MembershipActionsPanel) showing plan/cycle/next billing date with Record Payment (creates a real Billing invoice for the cycle amount and advances nextBillingDate), Freeze/Resume (pauses/recalculates billing), and Check In (logs a usage timestamp, shown in a recent check-ins list) — plus the shared RecordDetail field grid/timeline and Edit/Delete actions in the header.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SubscriptionsDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("subscriptions");
  const record = await getBusinessRecord(params.partnerId, "subscriptions", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("subscriptions.detail", getSubscriptionsDetailFields(record), subscriptionsColumns);
  const timeline = getSubscriptionsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const membership = extractMembershipFromRecord(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "Subscriptions / Membership"}>
      <div>
        <MembershipActionsPanel partnerId={params.partnerId} membership={membership} />

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
                <Link href={`/partner/${params.partnerId}/subscriptions`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/subscriptions/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="subscriptions" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
