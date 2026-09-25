import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { listChartOfAccounts } from "@/lib/accounting";

registerPage({
  id: "accounting.chart-of-accounts.list",
  moduleSlug: "accounting",
  title: "Accounting — Chart of Accounts",
  path: "/partner/[partnerId]/accounting/chart-of-accounts",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Lists every ChartOfAccount (Prisma-backed) grouped by Account Type — the ledger's own account master, distinct from the accounting-gst module's GST-specific data.",
  sourceFile: "src/app/partner/[partnerId]/accounting/chart-of-accounts/page.tsx",
});

export const dynamic = "force-dynamic";

const TYPE_ORDER = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;

export default async function ChartOfAccountsPage({ params }: { params: { partnerId: string } }) {
  const accounts = await listChartOfAccounts(params.partnerId);

  return (
    <AppShell
      topbarTitle="Chart of Accounts"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/accounting/chart-of-accounts/new`} className="btn-accent">
          + New Account
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Every ledger account, grouped by type — the master every Journal Entry line posts against.</p>

        {accounts.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No accounts yet — create one to start posting Journal Entries.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {TYPE_ORDER.map((type) => {
              const rows = accounts.filter((a) => a.accountType === type);
              if (rows.length === 0) return null;
              return (
                <div key={type}>
                  <div className="mb-2 text-sm font-semibold text-text">{type}</div>
                  <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
                    <table className="w-full min-w-[600px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                          <th className="px-3 py-2.5">Code</th>
                          <th className="px-3 py-2.5">Name</th>
                          <th className="px-3 py-2.5">Parent</th>
                          <th className="px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((a) => (
                          <tr key={a.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2 font-mono text-xs text-text-muted">{a.accountCode}</td>
                            <td className="px-3 py-2">
                              <Link
                                href={`/partner/${params.partnerId}/accounting/chart-of-accounts/${a.id}/edit`}
                                className="font-semibold text-teal hover:underline"
                              >
                                {a.accountName}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-text-muted">{a.parentAccountName ?? "—"}</td>
                            <td className="px-3 py-2">
                              <span className={a.isActive ? "text-success" : "text-text-muted"}>{a.isActive ? "Active" : "Inactive"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
