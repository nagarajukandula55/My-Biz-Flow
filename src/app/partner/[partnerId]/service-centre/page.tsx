import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ServiceCentreClientTable } from "./ServiceCentreClientTable";
import { ServiceCentreNewButton } from "./ServiceCentreNewButton";
import { buildServiceCentreCreateFields } from "@/lib/serviceCentreCreateFields";
import { applyCustomizations } from "@/lib/designer/customizations";
import {
  serviceCentreListColumns,
  isUnderWarranty,
  computeWorkorderTat,
  formatTatHours,
  computeDisplayStatus,
} from "@/lib/sample-data/service-centre";
import type { Column } from "@/components/DataTable";
import {
  listBusinessRecords,
  listBusinessRecordsPaginated,
  DEFAULT_BUSINESS_RECORD_PAGE_SIZE,
} from "@/lib/businessRecords";

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
 * Filter option lists (status/priority/brand/model/engineer) are drawn
 * from the full unfiltered set so dropdowns don't shrink as filters narrow
 * the visible rows.
 */
type SearchParams = {
  page?: string;
  status?: string;
  /**
   * The summary cards filter on this, NOT `status` — `status` is an
   * exact-match filter on the raw stored `status` field (pushed down to the
   * DB query below), while the cards are computed from milestone
   * (computeDisplayStatus, same as the Status COLUMN) and can't be
   * expressed as a single stored-field equality (it depends on
   * stage + onHold + cancelled together). "OPEN" is a virtual value meaning
   * "not CLOSED and not CANCELLED" (Created/In Progress/Part
   * Pending/Completed), matching the Open card's count below. When present,
   * this filter is applied in-memory against `allRows` and pagination is
   * computed from that filtered set instead of the DB query.
   */
  milestone?: string;
  brandName?: string;
  engineerName?: string;
  paymentMode?: string;
  warrantyStatus?: string;
  from?: string;
  to?: string;
  q?: string;
};

const SEARCH_FIELDS = ["id", "customer", "device", "customerPhone"];

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
  // Narrowed to exactly the 12 columns requested for this list (see
  // serviceCentreListColumns) — the full ~39-field serviceCentreColumns set
  // still backs the report builder, Designer column customization and the
  // printed job-card document elsewhere. TAT (below) is appended after
  // customization runs, as a plain computed text column, and the
  // interactive Actions column is appended client-side by
  // ServiceCentreClientTable (a render function can't cross the
  // Server->Client prop boundary) — neither is part of the Designer's
  // customizable "columns" region.
  const baseColumns = await applyCustomizations("service-centre.list", serviceCentreListColumns);
  const columns: Column[] = [...baseColumns, { key: "tat", label: "TAT", type: "text" }];

  const { status, milestone, brandName, engineerName, paymentMode, warrantyStatus, from, to, q } = searchParams;

  const page = Math.max(1, Number(searchParams.page) || 1);

  let rows: Awaited<ReturnType<typeof listBusinessRecords>>;
  let total: number;
  let totalPages: number;
  let pageSize: number;
  let allRows: Awaited<ReturnType<typeof listBusinessRecords>>;

  if (milestone) {
    // Card-driven filter — see the `milestone` SearchParams comment above:
    // this can't be pushed down to the DB query, so it's applied in-memory
    // against the full unfiltered set and paginated by hand.
    allRows = await listBusinessRecords(params.partnerId, "service-centre");
    const matchesMilestone = (row: (typeof allRows)[number]) => {
      const rowMilestone = computeDisplayStatus(row).milestone;
      return milestone === "OPEN" ? rowMilestone !== "CLOSED" && rowMilestone !== "CANCELLED" : rowMilestone === milestone;
    };
    const filtered = allRows.filter(matchesMilestone);
    pageSize = DEFAULT_BUSINESS_RECORD_PAGE_SIZE;
    total = filtered.length;
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  } else {
    [{ rows, total, totalPages, pageSize }, allRows] = await Promise.all([
      listBusinessRecordsPaginated(params.partnerId, "service-centre", {
        page,
        filters: { status, brandName, engineerName, paymentMode, warrantyStatus },
        dateRange: { field: "receivedDate", from, to },
        search: q ? { query: q, fields: SEARCH_FIELDS } : undefined,
      }),
      listBusinessRecords(params.partnerId, "service-centre"),
    ]);
  }

  // The "Under Warranty" column reads `warrantyFlag` off each row, but that
  // boolean is a separate, independently-editable field on the edit form
  // that's never kept in sync with the `warrantyStatus` dropdown a partner
  // actually picks at intake (Device > Warranty Type) — a workorder set to
  // "OOW"/"90 Days" there could still show "In Warranty" here. Overriding
  // it with isUnderWarranty() (the same function the detail page's badge
  // and the invoice/estimate chargeable-amount calc use) keeps this list in
  // sync with the one real source of truth instead of drifting on its own.
  const displayRows = rows.map((row) => {
    const stage = row["stage"] as string | undefined;
    const cancelledAt = row["cancelledAt"] as string | undefined;
    const { hours } = computeWorkorderTat({
      recordCreatedAt: row["recordCreatedAt"] as string | undefined,
      receivedDate: row["receivedDate"] as string | undefined,
      stageHistory: row["stageHistory"] as { at: string; stage: string }[] | undefined,
      cancelledAt,
      terminal: stage === "Closed" || Boolean(cancelledAt),
    });
    return {
      ...row,
      warrantyFlag: isUnderWarranty(row),
      tat: formatTatHours(hours),
      status: computeDisplayStatus(row).label,
    };
  });

  // Summary cards recompute against every OTHER active filter (brand/
  // engineer/payment mode/warranty status/date range/search) — deliberately
  // excluding `milestone` itself, since these cards ARE the milestone
  // selector (clicking one sets `?milestone=`); recomputing them from an
  // already-milestone-filtered set would collapse every other card to 0
  // instead of showing "how many in each milestone, given what else is
  // filtered" (same pattern as excluding `status` from Telecalling's
  // by-status breakdown for the identical reason). Uses the SAME milestone
  // logic as the Status column above (computeDisplayStatus ->
  // extractLifecycleFromRecord + mapStageToMilestone) so the cards, the
  // column and the filter dropdown never disagree on what counts as
  // Open/Closed/Cancelled/Part Pending. Cancelled is its own milestone,
  // distinct from Closed, per explicit feedback that the two must not be
  // conflated. Filter dropdown OPTIONS below still draw from the full
  // unfiltered `allRows`, not `cardRows`, so they don't shrink.
  const cardRows = allRows.filter((row) => {
    if (status && String(row["status"] ?? "") !== status) return false;
    if (brandName && String(row["brandName"] ?? "") !== brandName) return false;
    if (engineerName && String(row["engineerName"] ?? "") !== engineerName) return false;
    if (paymentMode && String(row["paymentMode"] ?? "") !== paymentMode) return false;
    if (warrantyStatus && String(row["warrantyStatus"] ?? "") !== warrantyStatus) return false;
    const receivedDate = String(row["receivedDate"] ?? "");
    if (from && receivedDate < from) return false;
    if (to && receivedDate > to) return false;
    if (q && !SEARCH_FIELDS.some((f) => String(row[f] ?? "").toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const milestoneCounts = cardRows.reduce<Record<string, number>>((acc, row) => {
    const { milestone } = computeDisplayStatus(row);
    acc[milestone] = (acc[milestone] ?? 0) + 1;
    return acc;
  }, {});
  const closedCount = milestoneCounts["CLOSED"] ?? 0;
  const cancelledCount = milestoneCounts["CANCELLED"] ?? 0;
  const partPendingCount = milestoneCounts["PART_PENDING"] ?? 0;
  const openCount = cardRows.length - closedCount - cancelledCount;

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  const distinct = (key: string) => Array.from(new Set(allRows.map((r) => String(r[key] ?? "")).filter(Boolean)));
  const statusOptions = distinct("status");
  const brandOptions = distinct("brandName");
  const engineerOptions = distinct("engineerName");
  const paymentModeOptions = distinct("paymentMode");
  const warrantyStatusOptions = distinct("warrantyStatus");

  const hasActiveFilters = Boolean(
    q || status || milestone || brandName || engineerName || paymentMode || warrantyStatus || from || to
  );

  // The quick-create modal renders the same domain-aware, brand-scoped
  // field set the full-page /new form does — one builder, no drift.
  const createFields = await buildServiceCentreCreateFields(params.partnerId);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Manage SC"}
      topbarActions={
        <ServiceCentreNewButton partnerId={params.partnerId} fields={createFields} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>

        {/*
          Open/Closed/Cancelled/Part Pending counts, computed from the same
          milestone logic as the Status column (computeDisplayStatus) so
          these numbers never disagree with what the column/filter show.
          Closed deliberately excludes Cancelled — they're separate
          milestones, per explicit feedback that the two must not be
          conflated. Reuses the small stat-card pattern from the
          Accounting/GST dashboard (StatCard below) rather than inventing
          new markup.
        */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Open"
            value={String(openCount)}
            href={`/partner/${params.partnerId}/service-centre?milestone=OPEN`}
            active={milestone === "OPEN"}
          />
          <StatCard
            label="Closed"
            value={String(closedCount)}
            href={`/partner/${params.partnerId}/service-centre?milestone=CLOSED`}
            active={milestone === "CLOSED"}
          />
          <StatCard
            label="Cancelled"
            value={String(cancelledCount)}
            href={`/partner/${params.partnerId}/service-centre?milestone=CANCELLED`}
            active={milestone === "CANCELLED"}
          />
          <StatCard
            label="Part Pending"
            value={String(partPendingCount)}
            href={`/partner/${params.partnerId}/service-centre?milestone=PART_PENDING`}
            active={milestone === "PART_PENDING"}
          />
        </div>

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
          <FilterSelect label="Brand" name="brandName" value={brandName} options={brandOptions} />
          <FilterSelect label="Engineer / Serviced By" name="engineerName" value={engineerName} options={engineerOptions} />
          <FilterSelect label="Payment Mode" name="paymentMode" value={paymentMode} options={paymentModeOptions} />
          <FilterSelect label="Warranty Status" name="warrantyStatus" value={warrantyStatus} options={warrantyStatusOptions} />
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
          <ServiceCentreClientTable partnerId={params.partnerId} columns={columns} rows={displayRows} />
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

function StatCard({ label, value, href, active }: { label: string; value: string; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 transition-colors hover:bg-bg-sunken ${
        active ? "border-accent bg-bg-sunken" : "border-border bg-bg-raised"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-text">{value}</div>
    </Link>
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
