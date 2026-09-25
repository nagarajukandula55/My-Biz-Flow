import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEmployees, getOpenCheckInToday } from "@/lib/hrms";
import { AttendanceClient } from "./AttendanceClient";

registerPage({
  id: "hrms.attendance",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Attendance",
  path: "/partner/[partnerId]/hrms/attendance",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The live check-in/check-out app: captures the browser's geolocation client-side and submits it to a server action that validates it against every registered OfficeLocation via a haversine distance check (checkGeofence in src/lib/hrms.ts). A check-in from outside every office's geofence is BLOCKED (documented design choice — the safer default for a real attendance app; adjustable later behind a partner setting). Runs inside the existing partner-authenticated dashboard in this pass — a separate employee self-service login (mirroring Telecalling's agent login or Field Force's provider login) is deliberately deferred, not built here. Photo capture is skipped (checkInPhotoUrl exists on the schema but unused — no file-upload storage is wired anywhere in this repo, per the prior Legal Document precedent).",
  sourceFile: "src/app/partner/[partnerId]/hrms/attendance/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AttendancePage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);

  const openCheckInEntries = await Promise.all(
    employees.map(async (e) => [e.id, Boolean(await getOpenCheckInToday(e.id))] as const)
  );
  const openCheckIns = new Set(openCheckInEntries.filter(([, isOpen]) => isOpen).map(([id]) => id));

  return (
    <AppShell
      topbarTitle={`Attendance — ${mod?.label ?? "HRMS / Payroll"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/hrms/attendance/history`} className="btn-outline">
          View History
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          Check in or out for an employee. Location is captured from this browser/device and validated against
          registered office geofences.
        </p>
        <div className="mt-6">
          <AttendanceClient
            partnerId={params.partnerId}
            employees={employees.map((e) => ({ id: e.id, name: e.name }))}
            openCheckIns={openCheckIns}
          />
        </div>
      </div>
    </AppShell>
  );
}
