import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listPlans, formatPaise } from "@/lib/subscriptions";
import { PlansClientTable } from "./PlansClientTable";

registerPage({
  id: "subscriptions.plans.list",
  moduleSlug: "subscriptions",
  title: "Subscriptions — Plans",
  path: "/partner/[partnerId]/subscriptions/plans",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists every SubscriptionPlan (Prisma-backed) in the plan catalog a partner can sell — name, billing cycle, plan amount, active status — with a \"+ New Plan\" action and row-click navigation into that plan's own edit page. A Subscriber optionally references one of these via planId.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/plans/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Plan Name", type: "text" },
  { key: "billingCycle", label: "Billing Cycle", type: "select-chip" },
  { key: "planAmount", label: "Plan Amount", type: "text" },
  { key: "isActive", label: "Active", type: "text" },
];

export default async function SubscriptionPlansPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");
  const plans = await listPlans(params.partnerId);
  const rows: Row[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    billingCycle: p.billingCycle,
    planAmount: formatPaise(p.planAmount),
    isActive: p.isActive ? "Yes" : "No",
  }));

  return (
    <AppShell
      topbarTitle={`Plans — ${mod?.label ?? "Subscriptions / Membership"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/subscriptions/plans/new`} className="btn-accent">
          + New Plan
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">The plan catalog Subscribers can be enrolled against.</p>
        <div className="mt-6">
          <PlansClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
