import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ExpensesClientTable } from "./ExpensesClientTable";
import { ExpensesNewButton } from "./ExpensesNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { expenseColumns, sumExpenses } from "@/lib/sample-data/billing-expenses";
import { listBusinessRecords } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";

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

export default async function ExpensesPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("billing.expenses.list", expenseColumns);
  const rows = await listBusinessRecords(params.partnerId, "billing-expenses");
  const total = sumExpenses(rows);

  return (
    <AppShell topbarTitle="Expenses" topbarActions={<ExpensesNewButton partnerId={params.partnerId} />}>
      <div>
        <p className="text-sm text-text-muted">
          {rows.length} expense{rows.length === 1 ? "" : "s"} recorded, totalling{" "}
          <span className="font-mono font-semibold text-text">{formatCurrencyINR(total)}</span>.
        </p>
        <div className="mt-4">
          <ExpensesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
