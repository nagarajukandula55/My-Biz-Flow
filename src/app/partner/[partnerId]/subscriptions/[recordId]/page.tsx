import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getSubscriber } from "@/lib/subscriptions";
import { MembershipActionsPanel, type MembershipPanelData } from "./MembershipActionsPanel";

registerPage({
  id: "subscriptions.detail",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Detail",
  path: "/partner/[partnerId]/subscriptions/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "billing-panel", label: "Billing / lifecycle panel" },
  ],
  explanation: "Detail view of a single Subscriber (Prisma-backed): a real billing panel (MembershipActionsPanel) showing plan/cycle/next billing date with Record Payment (creates a real Billing invoice for the cycle amount and advances nextBillingDate), Freeze/Resume (pauses/recalculates billing), and Check In (logs a usage timestamp, shown in a recent check-ins list), plus Edit/Delete actions in the header.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Paused: "warning",
  Expired: "danger",
  Cancelled: "neutral",
};

export default async function SubscriptionsDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");
  const subscriber = await getSubscriber(params.partnerId, params.recordId);
  if (!subscriber) notFound();

  const membership: MembershipPanelData = {
    id: subscriber.id,
    memberName: subscriber.memberName,
    planName: subscriber.plan?.name ?? null,
    billingCycle: subscriber.billingCycle,
    planAmount: subscriber.planAmount,
    nextBillingDate: subscriber.nextBillingDate ? subscriber.nextBillingDate.toISOString().slice(0, 10) : null,
    status: subscriber.status,
    resumeDate: subscriber.resumeDate ? subscriber.resumeDate.toISOString().slice(0, 10) : null,
    checkIns: Array.isArray(subscriber.checkIns) ? (subscriber.checkIns as { timestamp: string }[]) : [],
  };

  return (
    <AppShell topbarTitle={mod?.label ?? "Subscriptions / Membership"}>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-text">{subscriber.memberName}</h1>
            <p className="mt-1 text-xs text-text-muted">Membership detail</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusChip label={subscriber.status} variant={STATUS_VARIANT[subscriber.status] ?? "neutral"} />
            <Link href={`/partner/${params.partnerId}/subscriptions`} className="btn-outline">
              &larr; Back
            </Link>
            <Link
              href={`/partner/${params.partnerId}/subscriptions/${params.recordId}/edit`}
              className="btn-outline"
            >
              Edit
            </Link>
          </div>
        </div>

        <MembershipActionsPanel partnerId={params.partnerId} membership={membership} />
      </div>
    </AppShell>
  );
}
