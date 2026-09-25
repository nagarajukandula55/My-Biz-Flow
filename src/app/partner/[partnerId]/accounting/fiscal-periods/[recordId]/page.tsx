import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { formatDate } from "@/lib/format";
import { getFiscalPeriod } from "@/lib/accounting";
import { FiscalPeriodCloseButton } from "./FiscalPeriodCloseButton";

registerPage({
  id: "accounting.fiscal-periods.detail",
  moduleSlug: "accounting",
  title: "Accounting — Fiscal Period Detail",
  path: "/partner/[partnerId]/accounting/fiscal-periods/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Shows a FiscalPeriod and its Close/Reopen action — closing blocks JournalEntry create/edit within its date range.",
  sourceFile: "src/app/partner/[partnerId]/accounting/fiscal-periods/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function FiscalPeriodDetailPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const period = await getFiscalPeriod(params.partnerId, params.recordId);
  if (!period) notFound();

  return (
    <AppShell topbarTitle="Fiscal Period">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{period.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {formatDate(period.startDate.toISOString())} — {formatDate(period.endDate.toISOString())}
            </p>
          </div>
          <Link href={`/partner/${params.partnerId}/accounting/fiscal-periods`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</div>
          <div className={`mt-1 text-lg font-bold ${period.isClosed ? "text-danger" : "text-success"}`}>
            {period.isClosed ? "Closed" : "Open"}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {period.isClosed
              ? "No Journal Entry dated inside this range can be created or edited while it stays closed."
              : "Closing this period will block creating or editing any Journal Entry dated inside its range."}
          </p>
          <div className="mt-4">
            <FiscalPeriodCloseButton partnerId={params.partnerId} periodId={period.id} isClosed={period.isClosed} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
