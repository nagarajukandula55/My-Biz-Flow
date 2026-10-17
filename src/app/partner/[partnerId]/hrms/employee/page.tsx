import { registerPage } from "@/lib/designer/registry";
import { getEmployeeSession } from "@/lib/hrmsEmployeeAccess";
import { getOpenCheckInToday } from "@/lib/hrms";
import { EmployeeAttendancePortal } from "@/components/EmployeeAttendancePortal";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return { title: "Employee attendance", manifest: `/partner/${params.partnerId}/hrms/employee/manifest.webmanifest`, robots: { index: false, follow: false } };
}

registerPage({ id: "hrms.employee", moduleSlug: "hrms", title: "Employee attendance", path: "/partner/[partnerId]/hrms/employee", kind: "form", superAdminOnly: false,
  customizableRegions: [], explanation: "Employee-only password login and geofenced attendance. Identity comes from a dedicated revocable session. Temporary passwords must be replaced before attendance is allowed.", sourceFile: "src/app/partner/[partnerId]/hrms/employee/page.tsx" });
export const dynamic = "force-dynamic";
export default async function EmployeePage({ params }: { params: { partnerId: string } }) {
  const session = await getEmployeeSession(params.partnerId, true);
  const open = session && !session.mustChangePassword ? await getOpenCheckInToday(session.employee.id, params.partnerId) : null;
  return <main className="mbf-page min-h-screen bg-bg text-text"><h1 className="mb-4 font-display text-2xl font-bold">Employee attendance</h1>
    <p className="mb-6 text-sm text-text-muted">Business: {params.partnerId}. Use the employee credentials supplied by your administrator.</p>
    <EmployeeAttendancePortal partnerId={params.partnerId} name={session?.employee.name} temporary={session?.mustChangePassword} open={!!open} />
  </main>;
}
