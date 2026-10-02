import { requireTelecallingManager } from "@/lib/telecalling/authorization";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listLeadsForPartner, listLeadLocationFilters, getLeadStats } from "@/lib/telecalling/leadsData";
import { listActivePartnerStaff } from "@/lib/partnerStaff";
import { listIndiaStates } from "@/lib/geo/pincodeClient";
import { LeadsClient } from "./LeadsClient";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

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
  searchParams: { status?: string; state?: string; city?: string; assignedToId?: string; q?: string; page?: string };
}) {
  await requireTelecallingManager(params.partnerId);
  const filter = {
    status: searchParams.status || undefined,
    state: searchParams.state || undefined,
    city: searchParams.city || undefined,
    assignedToId: searchParams.assignedToId || undefined,
    search: searchParams.q || undefined,
  };
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ rows: leads, total, totalPages, pageSize }, agents, locationFilters, stats, indiaStates] = await Promise.all([
    listLeadsForPartner(params.partnerId, filter, { page }),
    listActivePartnerStaff(params.partnerId, "Telecaller"),
    listLeadLocationFilters(params.partnerId),
    getLeadStats(params.partnerId, filter),
    listIndiaStates(),
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-border px-6 py-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const isActive = searchParams.status === status;
            return (
              <Link
                key={status}
                href={buildPageQueryString(searchParams, { status: isActive ? undefined : status, page: undefined }) || "?"}
                className={`rounded-lg border px-3 py-2 transition-colors ${
                  isActive ? "border-accent bg-accent/10" : "border-border bg-bg-raised hover:bg-bg-sunken"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{status}</div>
                <div className="mt-0.5 font-display text-xl font-bold text-text">{count}</div>
              </Link>
            );
          })}
        </div>

        <div className="p-6">
          <LeadsClient
            partnerId={params.partnerId}
            leads={leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() }))}
            agents={agents.map((a) => ({ id: a.id, name: a.name }))}
            states={locationFilters.states}
            cities={locationFilters.cities}
            indiaStates={indiaStates}
            activeFilters={{
              status: filter.status ?? "",
              state: filter.state ?? "",
              city: filter.city ?? "",
              assignedToId: filter.assignedToId ?? "",
              q: filter.search ?? "",
            }}
          />
          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            buildHref={(p) => buildPageQueryString(searchParams, { page: String(p) })}
          />
        </div>
      </div>
    </AppShell>
  );
}
