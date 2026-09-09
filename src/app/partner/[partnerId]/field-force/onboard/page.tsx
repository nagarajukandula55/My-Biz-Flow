import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listServices } from "@/lib/fieldForce/servicesData";
import { onboardProviderAction } from "@/lib/fieldForce/actions";
import { ProviderOnboardForm } from "./ProviderOnboardForm";

registerPage({
  id: "field-force.onboard",
  moduleSlug: "field-force",
  title: "Field Force — Onboard Provider",
  path: "/partner/[partnerId]/field-force/onboard",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Recruits a new Provider (skilled or unskilled worker) into this partner's Field Force pool. A mandatory pincode sets their primary coverage area; they pick as many services as apply from the Service catalog, and can add any number of additional serviceable-area rows. Real data — Prisma-backed (Provider/ProviderService/ProviderServiceArea tables).",
  sourceFile: "src/app/partner/[partnerId]/field-force/onboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function OnboardProviderPage({ params }: { params: { partnerId: string } }) {
  const services = await listServices();
  const action = onboardProviderAction.bind(null, params.partnerId);

  return (
    <AppShell topbarTitle="Onboard Provider">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Onboard Provider</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Recruited from an outside source? Add them here — once onboarded, they become eligible for job
          dispatch wherever their services and serviceable areas match a customer's request.
        </p>
        <div className="mt-6">
          <ProviderOnboardForm services={services} action={action} />
        </div>
      </div>
    </AppShell>
  );
}
