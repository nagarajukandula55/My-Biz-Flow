import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { listBusinessRecords } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";
import {
  currentPeriodKey,
  recentPeriodKeys,
  periodLabel,
  periodKeyOf,
  gstDueDates,
  computeOutwardSupply,
} from "@/lib/gst";
import { computeEligibleItcForPeriod } from "@/lib/sample-data/accounting-gst-itc";
import { PeriodPicker } from "./PeriodPicker";

registerPage({
  id: "accounting-gst.dashboard",
  moduleSlug: "accounting-gst",
  title: "GST — Dashboard",
  path: "/vendor/[vendorId]/accounting-gst/dashboard",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Per-period GST snapshot: outward supply and ITC computed live from Billing invoices + the ITC register, compared against any accounting-gst return record already filed for that period, plus GSTR-1/3B due dates. The starting point for the GST Assistant — links out to Generate Return, HSN Summary and the ITC Register.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/dashboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function GstDashboardPage({
  params,
  searchParams,
}: {
  params: { vendorId: string };
  searchParams: { period?: string };
}) {
  const period = searchParams.period ?? currentPeriodKey();
  const periods = recentPeriodKeys(12).map((p) => ({ value: p, label: periodLabel(p) }));

  const [invoices, itcEntries, returns] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "accounting-gst-itc"),
    listBusinessRecords(params.vendorId, "accounting-gst"),
  ]);

  const periodInvoices = invoices.filter((inv) => periodKeyOf(String(inv["issueDate"] ?? "")) === period);
  const outward = computeOutwardSupply(periodInvoices);
  const eligibleItc = computeEligibleItcForPeriod(itcEntries, period);
  const dueDates = gstDueDates(period);

  const gstr1 = returns.find((r) => r["period"] === periodLabel(period) && r["returnType"] === "GSTR-1");
  const gstr3b = returns.find((r) => r["period"] === periodLabel(period) && r["returnType"] === "GSTR-3B");

  return (
    <AppShell
      topbarTitle="GST Dashboard"
      topbarActions={<PeriodPicker periods={periods} selected={period} />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Outward Taxable Value" value={formatCurrencyINR(outward.taxableValue)} sub={`${outward.invoiceCount} invoice${outward.invoiceCount === 1 ? "" : "s"}`} />
          <StatCard label="Output Tax Liability" value={formatCurrencyINR(outward.taxLiability)} />
          <StatCard label="Eligible ITC" value={formatCurrencyINR(eligibleItc)} sub="from ITC Register" />
          <StatCard
            label="Net Payable"
            value={formatCurrencyINR(Math.max(outward.taxLiability - eligibleItc, 0))}
            sub="Tax liability − ITC"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-bg-raised p-4">
            <div className="font-display text-sm font-bold text-text">Filing status — {periodLabel(period)}</div>
            <div className="mt-3 space-y-2 text-sm">
              <FilingRow
                label="GSTR-1 (Outward Supplies)"
                dueDate={dueDates.gstr1}
                status={gstr1 ? String(gstr1["filingStatus"]) : "Not Generated"}
                href={`/vendor/${params.vendorId}/accounting-gst/generate?period=${period}&returnType=GSTR-1`}
              />
              <FilingRow
                label="GSTR-3B (Summary Return)"
                dueDate={dueDates.gstr3b}
                status={gstr3b ? String(gstr3b["filingStatus"]) : "Not Generated"}
                href={`/vendor/${params.vendorId}/accounting-gst/generate?period=${period}&returnType=GSTR-3B`}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-raised p-4">
            <div className="font-display text-sm font-bold text-text">Quick links</div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href={`/vendor/${params.vendorId}/accounting-gst/hsn-summary`} className="btn-outline text-left">
                HSN-wise Summary
              </Link>
              <Link href={`/vendor/${params.vendorId}/accounting-gst/itc`} className="btn-outline text-left">
                ITC Register
              </Link>
              <Link href={`/vendor/${params.vendorId}/accounting-gst`} className="btn-outline text-left">
                All Filed Returns
              </Link>
            </div>
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

function FilingRow({ label, dueDate, status, href }: { label: string; dueDate: string; status: string; href: string }) {
  const variant = status === "Filed" ? "success" : status === "Late Filed" ? "danger" : status === "Not Generated" ? "neutral" : "warning";
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0">
      <div>
        <div className="font-semibold text-text">{label}</div>
        <div className="text-xs text-text-muted">Due {dueDate}</div>
      </div>
      <div className="flex items-center gap-3">
        <StatusChip label={status} variant={variant} />
        <Link href={href} className="text-xs font-semibold text-accent hover:underline">
          {status === "Not Generated" ? "Generate" : "View"}
        </Link>
      </div>
    </div>
  );
}
