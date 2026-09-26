import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { BrandClientTable } from "./BrandClientTable";
import { BrandNewButton } from "./BrandNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { brandColumns, brandFormFields, brandToRow } from "@/lib/sample-data/brand";
import { listBrands } from "@/lib/brandData";

registerPage({
  id: "brand.list",
  moduleSlug: "brand",
  title: "Brand — List",
  path: "/partner/[partnerId]/brand",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every Brand for this partner (Prisma-backed — see src/lib/brandData.ts), with a \"+ New\" action to create one and row-click navigation into the brand's detail view, which manages its own nested Locations.",
  sourceFile: "src/app/partner/[partnerId]/brand/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BrandPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("brand");
  const columns = await applyCustomizations("brand.list", brandColumns);
  const brands = await listBrands(params.partnerId);
  const rows = brands.map(brandToRow);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Brand"}
      topbarActions={
        <BrandNewButton partnerId={params.partnerId} fields={brandFormFields} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <BrandClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
