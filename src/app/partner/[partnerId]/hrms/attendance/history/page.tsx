import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import type { Column, Row } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listAttendanceHistory, listEmployees } from "@/lib/hrms";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { LinkedRecordTable } from "@/components/LinkedRecordTable";
import { RecordForm } from "@/components/RecordForm";
import { attendanceAudit } from "@/lib/hrms";
import { correctAttendanceAction } from "../controlActions";

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

function describeAuditShift(value: unknown) {
  const shift = value as { status?: string; checkInAt?: string; checkOutAt?: string } | null;
  if (!shift?.checkInAt) return "Unavailable";
  return `${shift.status ?? ""} · ${formatDateTime(shift.checkInAt)} → ${shift.checkOutAt ? formatDateTime(shift.checkOutAt) : "Open shift"}`;
}

export default async function AttendanceHistoryPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { employeeId?: string; from?: string; to?: string; page?: string; correct?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);
  const page = Math.min(10000, Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1));
  const query = new URLSearchParams({ ...(searchParams?.employeeId ? { employeeId: searchParams.employeeId } : {}), ...(searchParams?.from ? { from: searchParams.from } : {}), ...(searchParams?.to ? { to: searchParams.to } : {}), page: String(page) });
  const history = await listAttendanceHistory(params.partnerId, {
    employeeId: searchParams?.employeeId || undefined,
    from: searchParams?.from || undefined,
    to: searchParams?.to || undefined,
    page,
  });
  const selected = history.slice(0,50).find(row => row.id === searchParams?.correct);
  const audit = selected ? await attendanceAudit(params.partnerId, selected.id) : [];
  const localTime = (date: Date) => new Date(date.getTime() + 19800000).toISOString().slice(0,16);

  const rows: Row[] = history.slice(0,50).map((h) => ({
    id: h.id,
    href: `/partner/${params.partnerId}/hrms/attendance/history?${query.toString()}&correct=${h.id}`,
    employeeName: h.employee.name,
    checkInAt: formatDateTime(String(h.checkInAt)),
    checkOutAt: h.checkOutAt ? formatDateTime(String(h.checkOutAt)) : "—",
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
          <LinkedRecordTable columns={columns} rows={rows} />
          <nav aria-label="Attendance pages" className="mt-4 flex flex-wrap gap-3">
            {page > 1 && <Link className="btn-outline" href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page-1) })}`}>Previous</Link>}
            {history.length > 50 && page < 10000 && <Link className="btn-outline" href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page+1) })}`}>Next</Link>}
          </nav>
        </div>
        {selected && <section className="mt-8" aria-label="Attendance correction">
          <h2 className="font-display text-xl font-bold text-text">Correct attendance · {selected.employee.name}</h2>
          <p className="my-3 text-sm text-text-muted">Location evidence is the recorded device coordinate, not a verified street address. Open a map only when needed; coordinates are sent to the map provider when you follow the link.</p>
          <div className="flex flex-wrap gap-3">
            {[["Check-in", selected.checkInLat, selected.checkInLng], ["Check-out", selected.checkOutLat, selected.checkOutLng]].map(([label, lat, lng]) => typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? <a key={String(label)} className="btn-outline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`}>{label} location on map</a> : null)}
          </div>
          <p className="my-3 text-sm text-text-muted">Times are in IST. Corrections retain the original device coordinates and an audit of the old and new times. Payroll in finalized or paid periods is protected. Leave checkout blank only for an open shift.</p>
          <RecordForm fields={[
            { key: "checkInAt", label: "Check-in (IST)", type: "datetime", required: true },
            { key: "checkOutAt", label: "Check-out (IST)", type: "datetime" },
            { key: "status", label: "Attendance status", type: "select", required: true, options: ["Present", "Late", "HalfDay"] },
            { key: "reason", label: "Reason for correction", type: "textarea", required: true },
          ]} initialValues={{ checkInAt: localTime(selected.checkInAt), checkOutAt: selected.checkOutAt ? localTime(selected.checkOutAt) : "", status: selected.status }} submitLabel="Save audited correction" action={correctAttendanceAction.bind(null, params.partnerId, selected.id, JSON.stringify({ checkInAt: selected.checkInAt.toISOString(), checkOutAt: selected.checkOutAt?.toISOString() ?? null, status: selected.status }))} />
          <h3 className="my-4 font-display text-lg font-bold text-text">Recent corrections (latest 50)</h3>
          <DataTable columns={[{ key: "at", label: "Recorded (IST)", type: "text" }, { key: "actor", label: "Actor", type: "text" }, { key: "reason", label: "Reason", type: "text" }, { key: "before", label: "Before", type: "text" }, { key: "after", label: "After", type: "text" }]} rows={audit.map(record => { const data = record.data as Record<string, unknown>; return { id: record.id, at: formatDateTime(String(data.at)), actor: data.actor, reason: data.reason, before: describeAuditShift(data.before), after: describeAuditShift(data.after) }; })} />
        </section>}
      </div>
    </AppShell>
  );
}
