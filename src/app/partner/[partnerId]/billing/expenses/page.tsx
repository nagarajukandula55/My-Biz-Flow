import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { ExpensesClientTable } from "./ExpensesClientTable";
import { ExpensesNewButton } from "./ExpensesNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { expenseColumns, sumExpenses } from "@/lib/sample-data/billing-expenses";
import { listBusinessRecords, listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

registerPage({
  id: "billing.expenses.list",
  moduleSlug: "billing",
  title: "Billing — Expenses",
  path: "/partner/[partnerId]/billing/expenses",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Every business expense recorded against this partner — the cash-out side that the Profit & Loss report subtracts from invoiced revenue. Real persistence — the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/expenses/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "billing.expenses.list", "Expenses");
  if (tierGate) return <AppShell topbarTitle={"Expenses"}>{tierGate}</AppShell>;

  const columns = await applyCustomizations("billing.expenses.list", expenseColumns);
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Summary line needs every expense (count + sum), independent of which
  // page the table below is showing — same two-query shape as billing/
  // page.tsx's own summary cards vs. its paginated table.
  const [allRows, { rows, total, totalPages, pageSize }] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-expenses"),
    listBusinessRecordsPaginated(params.partnerId, "billing-expenses", { page }),
  ]);
  const expenseTotal = sumExpenses(allRows);

  return (
    <AppShell topbarTitle="Expenses" topbarActions={<ExpensesNewButton partnerId={params.partnerId} />}>
      <div>
        <p className="text-sm text-text-muted">
          {allRows.length} expense{allRows.length === 1 ? "" : "s"} recorded, totalling{" "}
          <span className="font-mono font-semibold text-text">{formatCurrencyINR(expenseTotal)}</span>.
        </p>
        <div className="mt-4">
          <ExpensesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          buildHref={(p) => buildPageQueryString(searchParams, { page: String(p) })}
        />
      </div>
    </AppShell>
  );
}
