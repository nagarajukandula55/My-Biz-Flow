import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import type { Column, Row } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listAttendanceHistory, listEmployees } from "@/lib/hrms";

registerPage({
  id: "hrms.attendance.history",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Attendance History",
  path: "/partner/[partnerId]/hrms/attendance/history",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "A filterable report of AttendanceCheckIn rows, filterable by employee/date range via GET searchParams (this repo's established filter-page convention).",
  sourceFile: "src/app/partner/[partnerId]/hrms/attendance/history/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "employeeName", label: "Employee", type: "text" },
  { key: "checkInAt", label: "Check In", type: "text" },
  { key: "checkOutAt", label: "Check Out", type: "text" },
  { key: "status", label: "Status", type: "text" },
];

export default async function AttendanceHistoryPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { employeeId?: string; from?: string; to?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);
  const history = await listAttendanceHistory(params.partnerId, {
    employeeId: searchParams?.employeeId || undefined,
    from: searchParams?.from || undefined,
    to: searchParams?.to || undefined,
  });

  const rows: Row[] = history.map((h) => ({
    id: h.id,
    employeeName: h.employee.name,
    checkInAt: new Date(h.checkInAt).toLocaleString(),
    checkOutAt: h.checkOutAt ? new Date(h.checkOutAt).toLocaleString() : "—",
    status: h.status,
  }));

  return (
    <AppShell topbarTitle={`Attendance History — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Employee</label>
            <select name="employeeId" defaultValue={searchParams?.employeeId ?? ""} className="mt-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="">All</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">From</label>
            <input type="date" name="from" defaultValue={searchParams?.from ?? ""} className="mt-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">To</label>
            <input type="date" name="to" defaultValue={searchParams?.to ?? ""} className="mt-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <button type="submit" className="btn-accent">
            Filter
          </button>
        </form>

        <div className="mt-6">
          <DataTable columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
