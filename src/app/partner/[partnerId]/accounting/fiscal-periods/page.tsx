import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { formatDate } from "@/lib/format";
import { listFiscalPeriods } from "@/lib/accounting";

registerPage({
  id: "accounting.fiscal-periods.list",
  moduleSlug: "accounting",
  title: "Accounting — Fiscal Periods",
  path: "/partner/[partnerId]/accounting/fiscal-periods",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Lists every FiscalPeriod (Prisma-backed) — closing one blocks creating/editing any JournalEntry dated inside its range (fail-closed, enforced in src/lib/accounting.ts).",
  sourceFile: "src/app/partner/[partnerId]/accounting/fiscal-periods/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function FiscalPeriodsPage({ params }: { params: { partnerId: string } }) {
  const periods = await listFiscalPeriods(params.partnerId);

  return (
    <AppShell
      topbarTitle="Fiscal Periods"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/accounting/fiscal-periods/new`} className="btn-accent">
          + New Period
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          Closing a period blocks creating or editing any Journal Entry dated inside it — real accounting-close enforcement.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Start Date</th>
                <th className="px-3 py-2.5">End Date</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-text-muted">
                    No fiscal periods yet.
                  </td>
                </tr>
              )}
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <Link href={`/partner/${params.partnerId}/accounting/fiscal-periods/${p.id}`} className="font-semibold text-teal hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{formatDate(p.startDate.toISOString())}</td>
                  <td className="px-3 py-2 text-text-muted">{formatDate(p.endDate.toISOString())}</td>
                  <td className="px-3 py-2">
                    <span className={p.isClosed ? "text-danger" : "text-success"}>{p.isClosed ? "Closed" : "Open"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
