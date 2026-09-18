import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { PaymentsClientTable } from "./PaymentsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingPaymentColumns } from "@/lib/sample-data/billing-payments";
import { listBusinessRecords, listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";

registerPage({
  id: "billing.payments.list",
  moduleSlug: "billing",
  title: "Billing — Payments",
  path: "/partner/[partnerId]/billing/payments",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every payment recorded against a Billing invoice, with mode/date filters, a \"+ New\" action, and row-click navigation into the record's detail view. The Invoice column resolves each payment's stored invoiceId (an internal record key) to the invoice's real, business-facing Invoice Number for display.",
  sourceFile: "src/app/partner/[partnerId]/billing/payments/page.tsx",
});

export const dynamic = "force-dynamic";

type SearchParams = {
  page?: string;
  mode?: string;
  from?: string;
  to?: string;
  q?: string;
};

const SEARCH_FIELDS = ["id", "contact", "invoiceId", "reference"];

function buildQueryString(params: SearchParams, overrides: Record<string, string | undefined>) {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export default async function BillingPaymentsPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: SearchParams;
}) {
  const columns = await applyCustomizations("billing.payments.list", billingPaymentColumns);

  const { mode, from, to, q } = searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ rows, total, totalPages, pageSize }, allRows, invoices] = await Promise.all([
    listBusinessRecordsPaginated(params.partnerId, "billing-payments", {
      page,
      filters: { mode },
      dateRange: { field: "date", from, to },
      search: q ? { query: q, fields: SEARCH_FIELDS } : undefined,
    }),
    listBusinessRecords(params.partnerId, "billing-payments"),
    // Looked up to resolve each payment's stored `invoiceId` (the Billing
    // invoice's internal record key, e.g. "BIL-A1B2C3" — see
    // createBusinessRecord in businessRecords.ts) to that invoice's real,
    // business-facing Invoice Number (`invoiceNumber`, assigned via
    // getNextNumber — see createInvoiceFromWorkorderAction and
    // businessRecordActions.ts). Without this, the "Invoice" column shows
    // the opaque internal key instead of the number the customer/printed
    // document actually knows the invoice by.
    listBusinessRecords(params.partnerId, "billing"),
  ]);

  const invoiceNumberByKey = new Map(
    invoices.map((inv) => [String(inv["id"]), String(inv["invoiceNumber"] ?? inv["id"])])
  );
  const withInvoiceNumber = (r: (typeof rows)[number]) => ({
    ...r,
    invoiceId: invoiceNumberByKey.get(String(r["invoiceId"])) ?? r["invoiceId"],
  });
  const displayRows = rows.map(withInvoiceNumber);

  const modeOptions = Array.from(new Set(allRows.map((r) => String(r["mode"] ?? "")).filter(Boolean)));
  // Deliberately from `allRows` (the full unfiltered set), not the current
  // page's filtered `rows` — same global-total convention as Billing's own
  // invoice list and Service Centre's milestone cards, so this number never
  // disagrees with the partner's real total collected regardless of the
  // search/date/mode filter currently applied.
  const totalCollected = allRows.reduce((sum, r) => sum + (Number(r["amount"]) || 0), 0);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);
  const hasActiveFilters = Boolean(q || mode || from || to);

  return (
    <AppShell
      topbarTitle="Payments"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/billing/payments/new`} className="btn-accent">
          + New Payment
        </Link>
      }
    >
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Collected" value={formatCurrencyINR(totalCollected)} sub={`${allRows.length} payment(s)`} />
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-bg-raised p-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Contact, invoice, reference…"
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Payment Mode</label>
            <select name="mode" defaultValue={mode ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text">
              <option value="">All</option>
              {modeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
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
            <a href={`/partner/${params.partnerId}/billing/payments`} className="btn-outline">Clear</a>
          )}
        </form>

        <div className="mt-4">
          <PaymentsClientTable partnerId={params.partnerId} columns={columns} rows={displayRows} />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            {total === 0
              ? "No payments match these filters."
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
