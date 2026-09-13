import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listPartnerStaff } from "@/lib/partnerStaff";
import { toggleStaffStatusAction, resetStaffPasswordAction } from "@/lib/serviceCentreStaffActions";

registerPage({
  id: "service-centre.staff.list",
  moduleSlug: "service-centre",
  title: "Service Centre — Staff",
  path: "/partner/[partnerId]/service-centre/staff",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Partner-owner-facing staff management: add/edit/suspend PartnerStaff accounts (technicians, front-desk, managers) so each has their own real login instead of sharing the Partner account — see /partner/[partnerId]/service-centre/staff-login. Real data, Prisma-backed (PartnerStaff table), Server Actions only.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ServiceCentreStaffListPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { created?: string; reset?: string; password?: string };
}) {
  const staff = await listPartnerStaff(params.partnerId);

  return (
    <AppShell
      topbarTitle="Service Centre — Staff"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/service-centre/staff/new`} className="btn-accent">
          + Add Staff
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          Add technicians, front-desk, or manager accounts for this Service Centre — each gets their own login at{" "}
          <span className="font-mono text-xs">/partner/{params.partnerId}/service-centre/staff-login</span>.
        </p>

        {searchParams.password && (
          <div className="mt-4 rounded-md border border-success-soft bg-success-soft px-4 py-3 text-sm">
            <p className="font-semibold text-success">
              {searchParams.created ? "Staff account created." : "Password reset."} Share this one-time password
              now — it won&apos;t be shown again.
            </p>
            <p className="mt-1 font-mono text-base font-bold text-text">{searchParams.password}</p>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-raised text-xs font-semibold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                    No staff accounts yet — add your first technician or front-desk account.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-text">{s.name}</td>
                    <td className="px-4 py-3 text-text-muted">{s.email}</td>
                    <td className="px-4 py-3 text-text-muted">{s.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-text-muted">{s.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.status === "Active" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <Link
                          href={`/partner/${params.partnerId}/service-centre/staff/${s.id}`}
                          className="font-semibold text-teal hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={resetStaffPasswordAction.bind(null, params.partnerId, s.id)}>
                          <button type="submit" className="font-semibold text-teal hover:underline">
                            Reset password
                          </button>
                        </form>
                        <form
                          action={toggleStaffStatusAction.bind(
                            null,
                            params.partnerId,
                            s.id,
                            s.status === "Active" ? "Suspended" : "Active"
                          )}
                        >
                          <button type="submit" className="font-semibold text-danger hover:underline">
                            {s.status === "Active" ? "Suspend" : "Reactivate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
