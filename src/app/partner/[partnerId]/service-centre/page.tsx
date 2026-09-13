import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ServiceCentreClientTable } from "./ServiceCentreClientTable";
import { ServiceCentreNewButton } from "./ServiceCentreNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { listBusinessRecords, listBusinessRecordsPaginated } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.list",
  moduleSlug: "service-centre",
  title: "Service Centre — List",
  path: "/partner/[partnerId]/service-centre",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every workorder record for the service-centre module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/page.tsx",
});

export const dynamic = "force-dynamic";

/**
 * Server-side filtering + pagination read from URL searchParams — a plain
 * GET form, no client JS required, matching this app's "server components
 * read data directly at render time" convention. Filters/search/date-range
 * are applied to the same paginated query (listBusinessRecordsPaginated),
 * so pagination operates on the filtered result set, not the full table.
 * Filter option lists (status/priority/brand/model/technician) are drawn
 * from the full unfiltered set so dropdowns don't shrink as filters narrow
 * the visible rows.
 */
type SearchParams = {
  page?: string;
  status?: string;
  priority?: string;
  brandName?: string;
  modelName?: string;
  technicianName?: string;
  from?: string;
  to?: string;
  q?: string;
};

const SEARCH_FIELDS = ["id", "customer", "device"];

function buildQueryString(params: SearchParams, overrides: Record<string, string | undefined>) {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export default async function ServiceCentrePage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: SearchParams;
}) {
  const mod = await getModule("service-centre");
  const columns = await applyCustomizations("service-centre.list", serviceCentreColumns);

  const { status, priority, brandName, modelName, technicianName, from, to, q } = searchParams;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const [{ rows, total, totalPages, pageSize }, allRows] = await Promise.all([
    listBusinessRecordsPaginated(params.partnerId, "service-centre", {
      page,
      filters: { status, priority, brandName, modelName, technicianName },
      dateRange: { field: "receivedDate", from, to },
      search: q ? { query: q, fields: SEARCH_FIELDS } : undefined,
    }),
    listBusinessRecords(params.partnerId, "service-centre"),
  ]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  const distinct = (key: string) => Array.from(new Set(allRows.map((r) => String(r[key] ?? "")).filter(Boolean)));
  const statusOptions = distinct("status");
  const priorityOptions = distinct("priority");
  const brandOptions = distinct("brandName");
  const modelOptions = distinct("modelName");
  const technicianOptions = distinct("technicianName");

  const hasActiveFilters = Boolean(q || status || priority || brandName || modelName || technicianName || from || to);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Service Centre"}
      topbarActions={
        <ServiceCentreNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>

        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-bg-raised p-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Customer, device, job id…"
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
            />
          </div>
          <FilterSelect label="Status" name="status" value={status} options={statusOptions} />
          <FilterSelect label="Priority" name="priority" value={priority} options={priorityOptions} />
          <FilterSelect label="Brand" name="brandName" value={brandName} options={brandOptions} />
          <FilterSelect label="Model" name="modelName" value={modelName} options={modelOptions} />
          <FilterSelect label="Technician" name="technicianName" value={technicianName} options={technicianOptions} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</label>
            <input type="date" name="from" defaultValue={from ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</label>
            <input type="date" name="to" defaultValue={to ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
          <button type="submit" className="btn-accent">Apply</button>
          {hasActiveFilters && (
            <a href={`/partner/${params.partnerId}/service-centre`} className="btn-outline">Clear</a>
          )}
        </form>

        <div className="mt-6">
          <ServiceCentreClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            {total === 0
              ? "No workorders match these filters."
              : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildQueryString(searchParams, { page: String(Math.max(1, page - 1)) })}
              aria-disabled={page <= 1}
              className={`rounded-md border border-border px-3 py-1.5 ${
                page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-bg-sunken"
              }`}
            >
              Previous
            </Link>
            <span>
              Page {page} of {totalPages}
            </span>
            <Link
              href={buildQueryString(searchParams, { page: String(Math.min(totalPages, page + 1)) })}
              aria-disabled={page >= totalPages}
              className={`rounded-md border border-border px-3 py-1.5 ${
                page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-bg-sunken"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value?: string; options: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</label>
      <select name={name} defaultValue={value ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text">
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
