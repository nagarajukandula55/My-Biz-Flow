import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listSubscribers, formatPaise } from "@/lib/subscriptions";
import { SubscriptionsClientTable } from "./SubscriptionsClientTable";

registerPage({
  id: "subscriptions.list",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — List",
  path: "/partner/[partnerId]/subscriptions",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every Subscriber (Prisma-backed) for the subscriptions module in a sortable table — member, plan, billing cycle, next billing date, plan amount, status — with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "memberName", label: "Member Name", type: "text" },
  { key: "planName", label: "Plan", type: "text" },
  { key: "billingCycle", label: "Billing Cycle", type: "select-chip" },
  { key: "startDate", label: "Start Date", type: "date" },
  { key: "nextBillingDate", label: "Next Billing", type: "date" },
  { key: "planAmount", label: "Plan Amount", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select-chip",
    chipVariantMap: { Active: "success", Paused: "warning", Expired: "danger", Cancelled: "neutral" },
  },
];

export default async function SubscriptionsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");
  const subscribers = await listSubscribers(params.partnerId);
  const rows: Row[] = subscribers.map((s) => ({
    id: s.id,
    memberName: s.memberName,
    planName: s.plan?.name ?? "—",
    billingCycle: s.billingCycle,
    startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : "",
    nextBillingDate: s.nextBillingDate ? s.nextBillingDate.toISOString().slice(0, 10) : "",
    planAmount: formatPaise(s.planAmount),
    status: s.status,
  }));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Subscriptions / Membership"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/subscriptions/new`} className="btn-accent">
          + New Membership
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <SubscriptionsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
