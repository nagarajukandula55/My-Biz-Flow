import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { renderTierGate } from "@/lib/pageTierGate";
import { getPartner } from "@/lib/partnerData";
import { getInventoryStatement, type InventorySourceType } from "@/lib/inventoryLedger";
import { formatCurrencyINR, formatDate } from "@/lib/format";

registerPage({
  id: "inventory.transactions.list",
  moduleSlug: "inventory",
  title: "Inventory — Transactions / Statement",
  path: "/partner/[partnerId]/inventory/transactions",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Pro+ inventory money ledger — every InventoryTransaction row (Stock Adjustment, Stock Transfer, Return Order, Part Order, Stock Take) with a running debit/credit statement, filterable by date range and source type.",
  sourceFile: "src/app/partner/[partnerId]/inventory/transactions/page.tsx",
});

export const dynamic = "force-dynamic";

const SOURCE_TYPE_LABELS: Record<InventorySourceType, string> = {
  "stock-adjustment": "Stock Adjustment",
  "stock-transfer": "Stock Transfer",
  "return-order": "Return Order",
  "part-order": "Part Order",
  "stock-take": "Stock Take",
};

const SOURCE_TYPE_OPTIONS = Object.keys(SOURCE_TYPE_LABELS) as InventorySourceType[];

/** Maps a ledger row's (sourceType, sourceRecordId) to the URL of the source document that created it. */
function sourceRecordHref(partnerId: string, sourceType: string, sourceRecordId: string): string | null {
  switch (sourceType as InventorySourceType) {
    case "stock-adjustment":
      return `/partner/${partnerId}/inventory/stock-adjustments/${sourceRecordId}`;
    case "stock-transfer":
      return `/partner/${partnerId}/inventory/stock-transfers/${sourceRecordId}`;
    case "return-order":
      return `/partner/${partnerId}/inventory/return-orders/${sourceRecordId}`;
    case "part-order":
      return `/partner/${partnerId}/inventory/part-orders/${sourceRecordId}`;
    case "stock-take":
      return `/partner/${partnerId}/inventory/stock-take/${sourceRecordId}`;
    default:
      return null;
  }
}

export default async function InventoryTransactionsPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string; sourceType?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "inventory.transactions.list", "Inventory Transactions / Statement");
  if (tierGate) return <AppShell topbarTitle="Inventory Transactions">{tierGate}</AppShell>;

  const { from, to, sourceType } = searchParams ?? {};
  const validSourceType =
    sourceType && SOURCE_TYPE_OPTIONS.includes(sourceType as InventorySourceType)
      ? (sourceType as InventorySourceType)
      : undefined;

  const [partner, statement] = await Promise.all([
    getPartner(params.partnerId),
    getInventoryStatement(params.partnerId, {
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
      sourceType: validSourceType,
    }),
  ]);

  const clearHref = `/partner/${params.partnerId}/inventory/transactions`;

  return (
    <AppShell topbarTitle="Inventory Transactions">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Inventory Transactions / Statement</h1>
        <p className="mt-1 text-xs text-text-muted">
          Every inventory money movement — Stock Adjustments, Stock Transfers, Return Orders, Part Orders and Stock
          Take — as a single debit/credit statement.
        </p>

        {/* (a) Summary card FIRST */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-bg-raised p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Debit</div>
            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-danger">
              {formatCurrencyINR(statement.totalDebit / 100)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Credit</div>
            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-success">
              {formatCurrencyINR(statement.totalCredit / 100)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Net Balance</div>
            <div
              className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                statement.netBalance >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatCurrencyINR(statement.netBalance / 100)}
            </div>
          </div>
        </div>

        {/* (b) Partner Details, below the summary */}
        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Partner Details</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Partner ID</div>
              <div className="mt-0.5 text-sm text-text">{partner?.id ?? params.partnerId}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Business Name</div>
              <div className="mt-0.5 text-sm text-text">{partner?.businessName ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Login Contact</div>
              <div className="mt-0.5 text-sm text-text">{partner?.loginContact ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</div>
              <div className="mt-0.5 text-sm text-text">{partner?.status ?? "Unknown"}</div>
            </div>
          </div>
        </div>

        {/* (c) Filters — GET-based searchParams form */}
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Source Type</span>
            <select
              name="sourceType"
              defaultValue={validSourceType ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            >
              <option value="">All</option>
              {SOURCE_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {SOURCE_TYPE_LABELS[opt]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-outline">Apply</button>
          {(from || to || validSourceType) && (
            <a href={clearHref} className="btn-outline">Clear</a>
          )}
        </form>

        {/* (d) Transaction table */}
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Source Type</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Direction</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Source Record</th>
              </tr>
            </thead>
            <tbody>
              {statement.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              )}
              {statement.rows.map((row) => {
                const href = sourceRecordHref(params.partnerId, row.sourceType, row.sourceRecordId);
                return (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-text-muted">{formatDate(row.occurredAt)}</td>
                    <td className="px-3 py-2 text-text">
                      {SOURCE_TYPE_LABELS[row.sourceType as InventorySourceType] ?? row.sourceType}
                    </td>
                    <td className="px-3 py-2 text-text">{row.description}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`font-semibold ${row.direction === "debit" ? "text-danger" : "text-success"}`}
                      >
                        {row.direction === "debit" ? "Debit" : "Credit"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-text">
                      {formatCurrencyINR(row.amount / 100)}
                    </td>
                    <td className="px-3 py-2">
                      {href ? (
                        <Link href={href} className="font-semibold text-teal hover:underline">
                          {row.sourceRecordId}
                        </Link>
                      ) : (
                        <span className="text-text-muted">{row.sourceRecordId}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
