import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getEmployee, listLeaveBalances, listLeaveRequests, listPayslips, listAttendanceHistory } from "@/lib/hrms";

registerPage({
  id: "hrms.detail",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Employee Detail",
  path: "/partner/[partnerId]/hrms/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Read-only detail view of a single Employee — profile fields, reporting manager, plus recent attendance/leave/payslip summaries for this employee pulled from the Prisma-backed HRMS tables.",
  sourceFile: "src/app/partner/[partnerId]/hrms/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function HrmsDetailPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employee = await getEmployee(params.partnerId, params.recordId);
  if (!employee) notFound();

  const [balances, leaveRequests, payslips, attendance] = await Promise.all([
    listLeaveBalances(employee.id),
    listLeaveRequests(params.partnerId, employee.id),
    listPayslips(params.partnerId, employee.id),
    listAttendanceHistory(params.partnerId, { employeeId: employee.id }),
  ]);

  return (
    <AppShell topbarTitle={mod?.label ?? "HRMS / Payroll"}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-text">{employee.name}</h1>
            <p className="mt-1 text-xs text-text-muted">
              {employee.designation || "—"} {employee.department ? `· ${employee.department}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/partner/${params.partnerId}/hrms`} className="btn-outline">
              &larr; Back
            </Link>
            <Link href={`/partner/${params.partnerId}/hrms/${employee.id}/edit`} className="btn-outline">
              Edit
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Contact" value={employee.contact} />
          <Field label="Email" value={employee.email} />
          <Field label="Reporting Manager" value={employee.reportingManager?.name} />
          <Field label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toDateString() : undefined} />
        </div>
        <div className="mt-2">
          <StatusChip label={employee.status} variant={employee.status === "Active" ? "success" : employee.status === "OnLeave" ? "warning" : "danger"} />
        </div>

        <div className="mt-8 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Recent Attendance</h2>
          {attendance.length === 0 && <p className="mt-2 text-sm text-text-muted">No attendance records yet.</p>}
          {attendance.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attendance.slice(0, 10).map((a) => (
                <StatusChip
                  key={a.id}
                  label={`${new Date(a.checkInAt).toLocaleDateString()} — ${a.status}${a.checkOutAt ? "" : " (open)"}`}
                  variant={a.status === "Present" ? "success" : a.status === "Late" ? "warning" : "amber"}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Leave Balances</h2>
          {balances.length === 0 && <p className="mt-2 text-sm text-text-muted">No leave balances set up yet.</p>}
          {balances.length > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              {balances.map((b) => (
                <div key={b.id} className="flex justify-between">
                  <span className="text-text">{b.leaveType}</span>
                  <span className="text-text-muted">{b.usedDays} / {b.totalDays} used</span>
                </div>
              ))}
            </div>
          )}
          {leaveRequests.length > 0 && (
            <div className="mt-4 space-y-2">
              {leaveRequests.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <span className="text-text">{l.leaveType}: {new Date(l.startDate).toDateString()} → {new Date(l.endDate).toDateString()}</span>
                  <StatusChip label={l.status} variant={l.status === "Approved" ? "success" : l.status === "Rejected" ? "danger" : "warning"} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Recent Payslips</h2>
          {payslips.length === 0 && <p className="mt-2 text-sm text-text-muted">No payslips yet.</p>}
          {payslips.length > 0 && (
            <div className="mt-3 space-y-2">
              {payslips.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <span className="text-text">{p.month}/{p.year}</span>
                  <span className="tabular-nums text-text">Net Pay ₹{(p.netPay / 100).toLocaleString("en-IN")}</span>
                  <StatusChip label={p.status} variant={p.status === "Paid" ? "success" : p.status === "Finalized" ? "warning" : "amber"} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-sm text-text">{value || "—"}</div>
    </div>
  );
}
