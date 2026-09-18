import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listLeadsForPartner, listLeadLocationFilters, getLeadStats } from "@/lib/telecalling/leadsData";
import { listActivePartnerStaff } from "@/lib/partnerStaff";
import { LeadsClient } from "./LeadsClient";

registerPage({
  id: "telecalling.leads",
  moduleSlug: "telecalling",
  title: "Telecalling — Leads",
  path: "/partner/[partnerId]/telecalling",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Manager dashboard for the standalone Telecalling / Call Centre module — completely independent of Service Centre (its own Lead/Call/MessageTemplate/MessageLog tables, own nav group). Every uploaded or manually-added Lead, filterable by status/state/city/agent, who it's assigned to, and its call status. Upload a CSV to bulk-add contacts (with state/city columns) and auto-assign them to Telecaller agents. Real data — Prisma-backed, scoped to this partner.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function TelecallingPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { status?: string; state?: string; city?: string; assignedToId?: string; q?: string };
}) {
  const filter = {
    status: searchParams.status || undefined,
    state: searchParams.state || undefined,
    city: searchParams.city || undefined,
    assignedToId: searchParams.assignedToId || undefined,
    search: searchParams.q || undefined,
  };

  const [leads, agents, locationFilters, stats] = await Promise.all([
    listLeadsForPartner(params.partnerId, filter),
    listActivePartnerStaff(params.partnerId, "Telecaller"),
    listLeadLocationFilters(params.partnerId),
    getLeadStats(params.partnerId, filter),
  ]);

  return (
    <AppShell topbarTitle="Telecalling — Leads">
      <div className="mbf-page">
        <div className="flex flex-col gap-3 border-b border-border bg-bg-raised px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-text">Telecalling / Call Centre</h1>
            <p className="mt-1 text-sm text-text-muted">
              {stats.total} lead{stats.total === 1 ? "" : "s"} total · {stats.unassigned} unassigned · {agents.length} active
              telecaller{agents.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/partner/${params.partnerId}/telecalling/templates`}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
            >
              Message Templates
            </Link>
            <Link
              href={`/partner/${params.partnerId}/telecalling/queue`}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
            >
              My Call Queue
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-border px-6 py-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-border bg-bg-raised px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{status}</div>
              <div className="mt-0.5 font-display text-xl font-bold text-text">{count}</div>
            </div>
          ))}
        </div>

        <div className="p-6">
          <LeadsClient
            partnerId={params.partnerId}
            leads={leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() }))}
            agents={agents.map((a) => ({ id: a.id, name: a.name }))}
            states={locationFilters.states}
            cities={locationFilters.cities}
            activeFilters={{
              status: filter.status ?? "",
              state: filter.state ?? "",
              city: filter.city ?? "",
              assignedToId: filter.assignedToId ?? "",
              q: filter.search ?? "",
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
