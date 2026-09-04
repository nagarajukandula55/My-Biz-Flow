import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { BrandClientTable } from "./BrandClientTable";
import { BrandNewButton } from "./BrandNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { brandColumns } from "@/lib/sample-data/brand";
import { listBusinessRecords } from "@/lib/businessRecords";

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
  explanation: "Lists every location record for the brand module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/brand/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BrandPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("brand");
  const columns = await applyCustomizations("brand.list", brandColumns);
  const rows = await listBusinessRecords(params.partnerId, "brand");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Brand"}
      topbarActions={
        <BrandNewButton partnerId={params.partnerId} />
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

