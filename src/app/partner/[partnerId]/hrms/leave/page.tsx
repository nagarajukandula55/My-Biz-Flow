import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listLeaveRequests } from "@/lib/hrms";
import { LeaveDecisionButtons } from "./LeaveDecisionButtons";

registerPage({
  id: "hrms.leave.list",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Leave",
  path: "/partner/[partnerId]/hrms/leave",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every LeaveRequest with an Approve/Reject action for Pending requests — approval increments the matching LeaveBalance.usedDays.",
  sourceFile: "src/app/partner/[partnerId]/hrms/leave/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LeavePage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const leaveRequests = await listLeaveRequests(params.partnerId);

  return (
    <AppShell
      topbarTitle={`Leave — ${mod?.label ?? "HRMS / Payroll"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/hrms/leave/new`} className="btn-accent">
          + Request Leave
        </Link>
      }
    >
      <div>
        {leaveRequests.length === 0 && <p className="text-sm text-text-muted">No leave requests yet.</p>}
        <div className="space-y-2">
          {leaveRequests.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-text">{l.employee.name}</span>
                <span className="ml-2 text-text-muted">
                  {l.leaveType}: {new Date(l.startDate).toDateString()} → {new Date(l.endDate).toDateString()}
                  {l.reason ? ` — ${l.reason}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip label={l.status} variant={l.status === "Approved" ? "success" : l.status === "Rejected" ? "danger" : "warning"} />
                {l.status === "Pending" && <LeaveDecisionButtons partnerId={params.partnerId} leaveId={l.id} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
