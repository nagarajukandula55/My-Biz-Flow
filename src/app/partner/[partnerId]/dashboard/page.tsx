import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { getVisibleModuleSlugs, getVisibleModules } from "@/lib/designer/entitlements";
import { computeModuleStat } from "@/lib/analyticsData";
import { formatCurrencyINR } from "@/lib/format";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.partner-dashboard",
  moduleSlug: "platform",
  title: "Dashboard — Type-wise",
  path: "/partner/[partnerId]/dashboard",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [
    { key: "enabled-modules", label: "Which modules generate a widget here" },
    { key: "widget-order", label: "Widget order" },
  ],
  explanation:
    "Not one hardcoded dashboard and not 21 separate per-module dashboards — this page is dynamically composed from whichever modules this partner is BOTH enabled for and holds an active access key for (getVisibleModuleSlugs, src/lib/designer/entitlements.ts), generating one DashboardWidget per module via a generic aggregation helper (computeModuleStat) rather than per-module logic repeated 21 times. A partner whose access key for a module gets revoked loses that widget immediately, independent of their plan.",
  sourceFile: "src/app/partner/[partnerId]/dashboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage({ params }: { params: { partnerId: string } }) {
  const enabledSlugs = await getVisibleModuleSlugs(params.partnerId);
  const modules = await getVisibleModules(params.partnerId);
  const stats = await Promise.all(enabledSlugs.map((slug) => computeModuleStat(params.partnerId, slug)));

  return (
    <AppShell topbarTitle="Dashboard">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Composed from the modules you currently have access to —{" "}
          {modules.length > 0 ? modules.map((m) => m?.label).join(", ") : "none yet"}. This list
          changes automatically as access is granted or withdrawn.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {enabledSlugs.map((slug, i) => {
            const mod = modules[i];
            const stat = stats[i];
            const value =
              stat.currencySum !== undefined
                ? formatCurrencyINR(stat.currencySum)
                : String(stat.count);
            return (
              <DashboardWidget
                key={slug}
                label={mod?.label ?? slug}
                value={value}
                trend={{ direction: "up", label: `${stat.count} record${stat.count === 1 ? "" : "s"}` }}
                neon={i === 0}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
