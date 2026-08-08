import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { getModule } from "@/lib/designer/moduleRegistry";
import { getDemoEnabledModules } from "@/lib/designer/modules";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { computeModuleStat } from "@/lib/moduleData";
import { formatCurrencyINR } from "@/lib/format";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.vendor-dashboard",
  moduleSlug: "platform",
  title: "Dashboard — Type-wise",
  path: "/vendor/[vendorId]/dashboard",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [
    { key: "enabled-modules", label: "Which modules generate a widget here" },
    { key: "widget-order", label: "Widget order" },
  ],
  explanation:
    "Not one hardcoded dashboard and not 21 separate per-module dashboards — this page is dynamically composed from whichever modules a Vendor's TYPE actually has enabled (getDemoEnabledModules), generating one DashboardWidget per module via a generic aggregation helper (computeModuleStat) rather than per-module logic repeated 21 times. A POS+Billing Vendor and a Clinic+HRMS Vendor see structurally the same page with entirely different widgets.",
  sourceFile: "src/app/vendor/[vendorId]/dashboard/page.tsx",
});

export default async function VendorDashboardPage({ params }: { params: { vendorId: string } }) {
  const enabledSlugs = getDemoEnabledModules(params.vendorId);
  const modules = await Promise.all(enabledSlugs.map((slug) => getModule(slug)));

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups("dashboard")} topbarTitle="Dashboard">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Composed from this Vendor&apos;s enabled modules —{" "}
          {modules.map((m) => m?.label).join(", ")}. Enable a different set of
          modules and this grid changes shape with no code change.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {enabledSlugs.map((slug, i) => {
            const mod = modules[i];
            const stat = computeModuleStat(slug);
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
