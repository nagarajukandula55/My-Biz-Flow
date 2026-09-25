import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listPayslips } from "@/lib/hrms";
import { PayslipStatusControls } from "./PayslipStatusControls";

registerPage({
  id: "hrms.payroll.list",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Payroll",
  path: "/partner/[partnerId]/hrms/payroll",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every Payslip (basicPay/allowances/deductions/netPay, Draft/Finalized/Paid) with a status-advance action — moving to Finalized fires the hrmsPayrollCompleted Telegram alert.",
  sourceFile: "src/app/partner/[partnerId]/hrms/payroll/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PayrollPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const payslips = await listPayslips(params.partnerId);

  return (
    <AppShell
      topbarTitle={`Payroll — ${mod?.label ?? "HRMS / Payroll"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/hrms/payroll/new`} className="btn-accent">
          + New Payslip
        </Link>
      }
    >
      <div>
        {payslips.length === 0 && <p className="text-sm text-text-muted">No payslips yet.</p>}
        <div className="space-y-2">
          {payslips.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-text">{p.employee.name}</span>
                <span className="ml-2 text-text-muted">{p.month}/{p.year}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="tabular-nums text-text">Net Pay ₹{(p.netPay / 100).toLocaleString("en-IN")}</span>
                <StatusChip label={p.status} variant={p.status === "Paid" ? "success" : p.status === "Finalized" ? "warning" : "amber"} />
                <PayslipStatusControls partnerId={params.partnerId} payslipId={p.id} status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
