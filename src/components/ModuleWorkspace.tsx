import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { getWorkspaceSummary } from "@/lib/workspaceSummary";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";

export async function ModuleSummarySections({ partnerId, exclude = [], analytics = false }: { partnerId: string; exclude?: string[]; analytics?: boolean }) {
  const summaries = (await getWorkspaceSummary(partnerId)).filter(summary => !exclude.includes(summary.slug));
  return <>{summaries.map(summary => <section key={summary.slug} className="mt-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-text">{summary.label}</h2>
      <Link className="btn-outline" href={`/partner/${partnerId}/${summary.slug}`}>Open {summary.label}</Link>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summary.metrics.map(metric => <DashboardWidget key={metric.label} label={metric.label} value={metric.value.toLocaleString("en-IN")} />)}
    </div>
    {analytics && <div className="mt-3 flex flex-wrap gap-3">{summary.settings.map(link =>
      <Link className="text-sm text-teal underline" key={link.path} href={`/partner/${partnerId}/${link.path}`}>{link.label}</Link>
    )}</div>}
  </section>)}</>;
}

export async function ModuleWorkspace({ partnerId, analytics = false }: { partnerId: string; analytics?: boolean }) {
  const modules = await getVisibleModuleSlugs(partnerId);
  const title = analytics ? "Analytics" : "Dashboard";
  return <AppShell topbarTitle={title}>
    <h1 className="font-display text-2xl font-bold text-text">{title}</h1>
    <p className="mt-2 text-sm text-text-muted">{analytics ? "Current operational totals" : "Your business overview"} for your active modules. Counts reflect all current records; they are not period revenue.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Link className="btn-outline" href={`/partner/${partnerId}/settings`}>Business settings</Link>
      <Link className="btn-outline" href={`/partner/${partnerId}/settings/notifications`}>Telegram notifications</Link>
    </div>
    {!modules.length && <p className="mt-6 text-sm text-text-muted">No active modules are available for this account. Contact your administrator to review access.</p>}
    <ModuleSummarySections partnerId={partnerId} analytics={analytics} />
  </AppShell>;
}
