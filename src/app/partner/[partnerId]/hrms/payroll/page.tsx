import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listPayslips } from "@/lib/hrms";
import { listPayrollCalculations } from "@/lib/hrmsAttendancePayroll";
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
  const tierGate = await renderTierGate(params.partnerId, "hrms.payroll.list", "Payroll");
  if (tierGate) return <AppShell topbarTitle="Payroll — HRMS / Payroll">{tierGate}</AppShell>;
  const mod = await getModule("hrms");
  const payslips = await listPayslips(params.partnerId);
  const calculations = await listPayrollCalculations(params.partnerId);

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
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-bg-raised px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-text">{p.employee.name}</span>
                <span className="ml-2 text-text-muted">{p.month}/{p.year}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="tabular-nums text-text">Net Pay ₹{(p.netPay / 100).toLocaleString("en-IN")}</span>
                <StatusChip label={p.status} variant={p.status === "Paid" ? "success" : p.status === "Finalized" ? "warning" : "amber"} />
                <PayslipStatusControls partnerId={params.partnerId} payslipId={p.id} status={p.status} />
              </div>
            </div>
          ))}
        </div>
        <section className="mt-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-text">Attendance calculation history</h2>
          <p className="text-sm text-text-muted">Latest 50 saved calculations. Review before finalizing. Changes to attendance, approved leave or calculated amounts require recalculation. History is retained when a draft is recalculated or manually replaced.</p>
          {calculations.map(row => {
            const data = row.data as { employeeId: string; month: number; year: number; at: string; reviewReason: string; netPay: number; calculation: { workingDays: number; attendanceDays: number; paidLeaveDays: number; unpaidDays: number; attendanceDeductionPaise: number }; policy: { workingWeekdays: number[]; excludedDates: string[] } };
            const employee = payslips.find(p => p.employeeId === data.employeeId)?.employee.name ?? "Employee";
            const c = data.calculation;
            return <details key={row.id} className="rounded-md border border-border bg-bg-raised p-4 text-sm">
              <summary className="cursor-pointer text-text">{employee} · {data.month}/{data.year} · Saved net ₹{(data.netPay / 100).toLocaleString("en-IN")}</summary>
              <p className="mt-2 text-text-muted">Working days: {c.workingDays}; attendance credits: {c.attendanceDays}; approved paid leave: {c.paidLeaveDays}; unpaid days: {c.unpaidDays}. Basic-pay attendance deduction: ₹{(c.attendanceDeductionPaise / 100).toLocaleString("en-IN")}.</p>
              <p className="mt-2 text-text-muted">Working weekdays: {data.policy.workingWeekdays.map(day => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")}. Excluded dates: {data.policy.excludedDates.join(", ") || "None"}.</p>
              <p className="mt-2 break-words text-text">Owner review: {data.reviewReason}</p>
              <p className="mt-2 text-text-muted">Saved {new Date(data.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
            </details>;
          })}
        </section>
      </div>
    </AppShell>
  );
}
