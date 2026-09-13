import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listServiceCentreTechnicians, setTechnicianStatusAction } from "@/lib/serviceCentreTechnicianActions";

registerPage({
  id: "service-centre.technicians.list",
  moduleSlug: "service-centre",
  title: "Service Centre — Technicians",
  path: "/partner/[partnerId]/service-centre/technicians",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Technician roster for the workorder assignment picker — name only, no login/account. Service Centre has a single login for the whole business (the partner session); there is no separate staff sign-in or sign-up anymore.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/technicians/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ServiceCentreTechniciansPage({ params }: { params: { partnerId: string } }) {
  const technicians = await listServiceCentreTechnicians(params.partnerId);

  return (
    <AppShell
      topbarTitle="Service Centre — Technicians"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/service-centre/technicians/new`} className="btn-accent">
          + Add Technician
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          Name the technicians who work here so you can assign them to workorders. There&apos;s no separate login
          for technicians — everyone at this Service Centre shares this one business login.
        </p>

        <div className="mt-6 overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-raised text-xs font-semibold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {technicians.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                    No technicians yet — add your first one.
                  </td>
                </tr>
              ) : (
                technicians.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-text">{t.name}</td>
                    <td className="px-4 py-3 text-text-muted">{t.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          t.status === "Active" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={setTechnicianStatusAction.bind(
                          null,
                          params.partnerId,
                          t.id,
                          t.status === "Active" ? "Suspended" : "Active"
                        )}
                      >
                        <button type="submit" className="text-xs font-semibold text-danger hover:underline">
                          {t.status === "Active" ? "Suspend" : "Reactivate"}
                        </button>
                      </form>
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
