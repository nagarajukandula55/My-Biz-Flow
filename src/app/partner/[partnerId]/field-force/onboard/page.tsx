import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listServices } from "@/lib/fieldForce/servicesData";
import { onboardEngineerAction } from "@/lib/fieldForce/actions";
import { EngineerOnboardForm } from "./EngineerOnboardForm";

registerPage({
  id: "field-force.onboard",
  moduleSlug: "field-force",
  title: "Field Force — Onboard Engineer",
  path: "/partner/[partnerId]/field-force/onboard",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Recruits a new engineer into the platform-wide Field Force pool. Lets them pick as many services as apply from the Service catalog, and add any number of serviceable-area rows — each row independently either a state/district/locality combination or a single pincode. Real data — Prisma-backed (Engineer/EngineerService/EngineerServiceArea tables).",
  sourceFile: "src/app/partner/[partnerId]/field-force/onboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function OnboardEngineerPage({ params }: { params: { partnerId: string } }) {
  const services = await listServices();
  const action = onboardEngineerAction.bind(null, params.partnerId);

  return (
    <AppShell topbarTitle="Onboard Engineer">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Onboard Engineer</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Recruited from an outside source? Add them here — once onboarded, they become eligible for job
          allocation wherever their services and serviceable areas match a brand&apos;s requirement.
        </p>
        <div className="mt-6">
          <EngineerOnboardForm services={services} action={action} />
        </div>
      </div>
    </AppShell>
  );
}
