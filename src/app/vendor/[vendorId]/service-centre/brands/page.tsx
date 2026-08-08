import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ScBrandClientTable } from "./ScBrandClientTable";
import { ScBrandNewButton } from "./ScBrandNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scBrandColumns } from "@/lib/sample-data/service-centre-brands";

registerPage({
  id: "service-centre.brands.list",
  moduleSlug: "service-centre",
  title: "Device Brands — List",
  path: "/vendor/[vendorId]/service-centre/brands",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Vendor-owned brand catalog for the service-centre module — used when creating a workorder.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/brands/page.tsx",
});

export default async function ScBrandListPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("service-centre.brands.list", scBrandColumns);

  return (
    <AppShell topbarTitle="Device Brands" topbarActions={<ScBrandNewButton />}>
      <div>
        <div className="mt-2">
          <ScBrandClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}
