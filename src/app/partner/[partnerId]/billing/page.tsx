import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { BillingClientTable } from "./BillingClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingColumns } from "@/lib/sample-data/billing";
import { listBusinessRecords, listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";

registerPage({
  id: "billing.list",
  moduleSlug: "billing",
  title: "Billing — List",
  path: "/partner/[partnerId]/billing",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every invoice record for the billing module in a sortable table — including invoices created directly here AND invoices Service Centre creates on workorder close (same moduleSlug, same table) — with summary cards, filters, and a \"+ New\" action to create one.",
  sourceFile: "src/app/partner/[partnerId]/billing/page.tsx",
});

export const dynamic = "force-dynamic";

/**
 * Server-side filtering + pagination read from URL searchParams — same
 * convention as the Service Centre list (src/app/partner/[partnerId]/
 * service-centre/page.tsx): a plain GET form, no client JS required.
 * Summary cards and filter option lists are computed from the full
 * unfiltered set (`allRows`) so they don't disagree with what's filtered,
 * and dropdowns don't shrink as filters narrow the visible rows.
 */
type SearchParams = {
  page?: string;
  paymentStatus?: string;
  paymentMode?: string;
  invoiceSource?: string;
  from?: string;
  to?: string;
  q?: string;
};

const SEARCH_FIELDS = ["id", "customer", "customerPhone", "customerGstin"];

function buildQueryString(params: SearchParams, overrides: Record<string, string | undefined>) {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: SearchParams;
}) {
  const mod = await getModule("billing");
  const columns = await applyCustomizations("billing.list", billingColumns);

  const { paymentStatus, paymentMode, invoiceSource, from, to, q } = searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ rows, total, totalPages, pageSize }, allRows] = await Promise.all([
    listBusinessRecordsPaginated(params.partnerId, "billing", {
      page,
      filters: { paymentStatus, paymentMode, invoiceSource },
      dateRange: { field: "issueDate", from, to },
      search: q ? { query: q, fields: SEARCH_FIELDS } : undefined,
    }),
    listBusinessRecords(params.partnerId, "billing"),
  ]);

  // Summary cards now reflect whatever's currently filtered — same
  // filters/date-range/search as the table query above, applied here
  // in-memory against the full set rather than a second DB round trip,
  // since the criteria are identical. Filter DROPDOWN OPTIONS still come
  // from the full unfiltered `allRows` below (distinct()) so they don't
  // shrink as filters narrow the result — only the numeric cards change.
  const hasSearchMatch = (r: (typeof allRows)[number]) =>
    !q || SEARCH_FIELDS.some((f) => String(r[f] ?? "").toLowerCase().includes(q.toLowerCase()));
  const filteredRows = allRows.filter((r) => {
    if (paymentStatus && String(r["paymentStatus"] ?? "") !== paymentStatus) return false;
    if (paymentMode && String(r["paymentMode"] ?? "") !== paymentMode) return false;
    if (invoiceSource && String(r["invoiceSource"] ?? "") !== invoiceSource) return false;
    const issueDate = String(r["issueDate"] ?? "");
    if (from && issueDate < from) return false;
    if (to && issueDate > to) return false;
    if (!hasSearchMatch(r)) return false;
    return true;
  });

  // "Collected" and "Overdue" use the same amountPaid-first "money actually
  // collected" convention as src/lib/analyticsData.ts (getAnalyticsSummary,
  // getRevenueBySource) — not a naive sum of totalAmount over
  // paymentStatus === "Paid" rows, which previously undercounted revenue
  // already collected against Partially Paid invoices and could disagree
  // with the Analytics page's own numbers for the same partner (Analytics
  // itself is always whole-partner/unfiltered, so this only matches when no
  // filter narrows the Billing list below its own totals).
  const totalInvoiced = filteredRows.reduce((sum, r) => sum + (Number(r["totalAmount"]) || 0), 0);
  const collectedTotal = filteredRows.reduce((sum, r) => {
    if (typeof r["amountPaid"] === "number") return sum + (r["amountPaid"] as number);
    if (r["paymentStatus"] === "Paid" && typeof r["totalAmount"] === "number") return sum + (r["totalAmount"] as number);
    return sum;
  }, 0);
  const collectedCount = filteredRows.filter((r) => (Number(r["amountPaid"]) || 0) > 0 || r["paymentStatus"] === "Paid").length;
  const overdueRows = filteredRows.filter((r) => r["paymentStatus"] === "Overdue");
  const draftRows = filteredRows.filter((r) => r["paymentStatus"] === "Draft");
  const overdueTotal = overdueRows.reduce((sum, r) => {
    if (typeof r["amountDue"] === "number") return sum + (r["amountDue"] as number);
    const total = Number(r["totalAmount"]) || 0;
    const paid = Number(r["amountPaid"]) || 0;
    return sum + Math.max(0, total - paid);
  }, 0);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  const distinct = (key: string) => Array.from(new Set(allRows.map((r) => String(r[key] ?? "")).filter(Boolean)));
  const paymentStatusOptions = distinct("paymentStatus");
  const paymentModeOptions = distinct("paymentMode");
  const invoiceSourceOptions = distinct("invoiceSource");

  const hasActiveFilters = Boolean(q || paymentStatus || paymentMode || invoiceSource || from || to);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Billing"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/billing/new`} className="btn-accent">
          + New Invoice
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>

        {/*
          Total Invoiced / Collected / Overdue / Draft — recompute from
          whatever's currently filtered (search/date-range/payment status/
          mode/source), same as the table below. "Collected" uses the same
          amountPaid-first revenue convention as the Analytics page.
        */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Invoiced" value={formatCurrencyINR(totalInvoiced)} sub={`${filteredRows.length} invoice(s)`} />
          <StatCard label="Collected" value={formatCurrencyINR(collectedTotal)} sub={`${collectedCount} invoice(s) paid in full or part`} />
          <StatCard label="Overdue (Balance Due)" value={formatCurrencyINR(overdueTotal)} sub={`${overdueRows.length} invoice(s)`} />
          <StatCard label="Draft" value={String(draftRows.length)} sub="not yet sent" />
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-bg-raised p-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Customer, phone, GSTIN, invoice id…"
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
            />
          </div>
          <FilterSelect label="Payment Status" name="paymentStatus" value={paymentStatus} options={paymentStatusOptions} />
          <FilterSelect label="Payment Mode" name="paymentMode" value={paymentMode} options={paymentModeOptions} />
          <FilterSelect label="Source" name="invoiceSource" value={invoiceSource} options={invoiceSourceOptions} />
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
            <a href={`/partner/${params.partnerId}/billing`} className="btn-outline">Clear</a>
          )}
        </form>

        <div className="mt-6">
          <BillingClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            {total === 0
              ? "No invoices match these filters."
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-text">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </div>
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
