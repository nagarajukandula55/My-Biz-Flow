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
  customer?: string;
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

  const { paymentStatus, customer, from, to, q } = searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ rows, total, totalPages, pageSize }, allRows] = await Promise.all([
    listBusinessRecordsPaginated(params.partnerId, "billing", {
      page,
      filters: { paymentStatus, customer },
      dateRange: { field: "issueDate", from, to },
      search: q ? { query: q, fields: SEARCH_FIELDS } : undefined,
    }),
    listBusinessRecords(params.partnerId, "billing"),
  ]);

  // Summary cards, computed from the full unfiltered set — invoices created
  // directly from Billing AND ones Service Centre stamps on workorder close
  // (createInvoiceFromWorkorderAction — same "billing" moduleSlug, same
  // table, no field that would exclude them from this query) both count.
  const totalInvoiced = allRows.reduce((sum, r) => sum + (Number(r["totalAmount"]) || 0), 0);
  const paidRows = allRows.filter((r) => r["paymentStatus"] === "Paid");
  const overdueRows = allRows.filter((r) => r["paymentStatus"] === "Overdue");
  const draftRows = allRows.filter((r) => r["paymentStatus"] === "Draft");
  const paidTotal = paidRows.reduce((sum, r) => sum + (Number(r["totalAmount"]) || 0), 0);
  const overdueTotal = overdueRows.reduce((sum, r) => sum + (Number(r["totalAmount"]) || 0), 0);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  const distinct = (key: string) => Array.from(new Set(allRows.map((r) => String(r[key] ?? "")).filter(Boolean)));
  const paymentStatusOptions = distinct("paymentStatus");
  const customerOptions = distinct("customer");

  const hasActiveFilters = Boolean(q || paymentStatus || customer || from || to);

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
          Total Invoiced / Paid / Overdue / Draft — computed from the same
          unfiltered set as the filter dropdowns below, so these numbers
          never disagree with what's actually filterable. Mirrors the
          Open/Closed/Cancelled/Part Pending stat-card row on the Service
          Centre list (src/app/partner/[partnerId]/service-centre/page.tsx).
        */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Invoiced" value={formatCurrencyINR(totalInvoiced)} sub={`${allRows.length} invoice(s)`} />
          <StatCard label="Paid" value={formatCurrencyINR(paidTotal)} sub={`${paidRows.length} invoice(s)`} />
          <StatCard label="Overdue" value={formatCurrencyINR(overdueTotal)} sub={`${overdueRows.length} invoice(s)`} />
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
          <FilterSelect label="Customer" name="customer" value={customer} options={customerOptions} />
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
