import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ScVendorProfileClientTable } from "./ScVendorProfileClientTable";
import { ScVendorProfileNewButton } from "./ScVendorProfileNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scVendorProfileColumns } from "@/lib/sample-data/service-centre-vendor-profile";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.vendor-profile.list",
  moduleSlug: "service-centre",
  title: "Vendor Profiles — List",
  path: "/partner/[partnerId]/service-centre/vendor-profile",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation:
    "Partner-owned catalog of sub-vendors / outsourced repair partners this Service Centre deals with (ported from AN-CRM's VendorProfile onboarding lifecycle) — distinct from this app's own Partner tenant model; see the comment in service-centre-vendor-profile.ts.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/vendor-profile/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScVendorProfileListPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("service-centre.vendor-profile.list", scVendorProfileColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-vendor-profile");

  return (
    <AppShell topbarTitle="Vendor Profiles" topbarActions={<ScVendorProfileNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <ScVendorProfileClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
