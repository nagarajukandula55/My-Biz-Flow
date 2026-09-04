import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listEngineers } from "@/lib/fieldForce/engineersData";
import { listServices } from "@/lib/fieldForce/servicesData";
import { setEngineerStatusAction, createServiceAction, setServiceActiveAction } from "@/lib/fieldForce/actions";
import { FieldForceAdminClient } from "./AdminClient";

registerPage({
  id: "field-force.admin",
  moduleSlug: "field-force",
  title: "Field Force — Admin",
  path: "/partner/[partnerId]/field-force/admin",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Super-Admin-only: approve/suspend recruited engineers, and manage the Service catalog engineers pick from during onboarding (add/deactivate — never a hard delete, so past onboarding data stays intact).",
  sourceFile: "src/app/partner/[partnerId]/field-force/admin/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function FieldForceAdminPage({ params }: { params: { partnerId: string } }) {
  const [engineers, services] = await Promise.all([listEngineers(), listServices(true)]);

  return (
    <AppShell topbarTitle="Field Force — Admin">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Field Force — Admin</h1>
          <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
            Approve engineers and manage the service catalog they onboard against.
          </p>
          <div className="mt-6">
            <FieldForceAdminClient
              engineers={engineers}
              services={services}
              setEngineerStatusAction={setEngineerStatusAction.bind(null, params.partnerId)}
              createServiceAction={createServiceAction.bind(null, params.partnerId)}
              setServiceActiveAction={setServiceActiveAction.bind(null, params.partnerId)}
            />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
