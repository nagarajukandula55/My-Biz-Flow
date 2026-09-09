import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listProviders } from "@/lib/fieldForce/providersData";
import { listServices } from "@/lib/fieldForce/servicesData";
import { getFieldForceSettings } from "@/lib/fieldForce/settingsData";
import {
  setProviderStatusAction,
  createServiceAction,
  setServiceActiveAction,
  updateServicePricingAction,
  updateFieldForceSettingsAction,
} from "@/lib/fieldForce/actions";
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
    "Super-Admin-only: approve/suspend onboarded Providers (skilled and unskilled), manage the priced Service catalog customers book from and providers pick from during onboarding, and toggle public self-signup for Customers/Providers on this partner's storefront.",
  sourceFile: "src/app/partner/[partnerId]/field-force/admin/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function FieldForceAdminPage({ params }: { params: { partnerId: string } }) {
  const [providers, services, settings] = await Promise.all([
    listProviders(params.partnerId),
    listServices(true),
    getFieldForceSettings(params.partnerId),
  ]);

  return (
    <AppShell topbarTitle="Field Force — Admin">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Field Force — Admin</h1>
          <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
            Approve providers, manage the service catalog, and control public self-signup.
          </p>
          <div className="mt-6">
            <FieldForceAdminClient
              providers={providers}
              services={services}
              settings={settings}
              setProviderStatusAction={setProviderStatusAction.bind(null, params.partnerId)}
              createServiceAction={createServiceAction.bind(null, params.partnerId)}
              setServiceActiveAction={setServiceActiveAction.bind(null, params.partnerId)}
              updateServicePricingAction={updateServicePricingAction.bind(null, params.partnerId)}
              updateSettingsAction={updateFieldForceSettingsAction.bind(null, params.partnerId)}
            />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
