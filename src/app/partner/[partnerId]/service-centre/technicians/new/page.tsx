import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { addTechnicianAction } from "@/lib/serviceCentreTechnicianActions";

registerPage({
  id: "service-centre.technicians.new",
  moduleSlug: "service-centre",
  title: "Service Centre — Add Technician",
  path: "/partner/[partnerId]/service-centre/technicians/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Name-only technician roster entry — no email/password/login is collected or created.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/technicians/new/page.tsx",
});

export default function AddTechnicianPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { error?: string };
}) {
  return (
    <AppShell topbarTitle="Add Technician">
      <div className="max-w-sm">
        {searchParams.error === "missing_name" && (
          <p className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Enter a name.
          </p>
        )}
        <form action={addTechnicianAction.bind(null, params.partnerId)} className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Technician Name
            <input
              type="text"
              name="name"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-accent mt-2 w-full">
            Add Technician
          </button>
        </form>
      </div>
    </AppShell>
  );
}
