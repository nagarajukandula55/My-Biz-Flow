import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ScProfileClientTable } from "./ScProfileClientTable";
import { ScProfileNewButton } from "./ScProfileNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scProfileColumns } from "@/lib/sample-data/service-centre-sc-profile";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.sc-profile.list",
  moduleSlug: "service-centre",
  title: "SC Profiles — List",
  path: "/partner/[partnerId]/service-centre/sc-profile",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation:
    "Partner-owned catalog of sub-SCs / outsourced repair partners this Service Centre deals with (ported from AN-CRM's VendorProfile onboarding lifecycle) — distinct from this app's own Partner tenant model; see the comment in service-centre-sc-profile.ts.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/sc-profile/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScProfileListPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("service-centre.sc-profile.list", scProfileColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-sc-profile");

  return (
    <AppShell topbarTitle="SC Profiles" topbarActions={<ScProfileNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <ScProfileClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
