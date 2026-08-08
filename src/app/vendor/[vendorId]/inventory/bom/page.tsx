import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { BomClientTable } from "./BomClientTable";
import { BomNewButton } from "./BomNewButton";
import { BomSearchButton } from "./BomSearchButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { bomColumns } from "@/lib/sample-data/bom";

registerPage({
  id: "inventory.bom.list",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — List",
  path: "/vendor/[vendorId]/inventory/bom",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every material catalog entry, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/bom/page.tsx",
});

export default async function BomPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("inventory.bom.list", bomColumns);

  return (
    <AppShell
      topbarTitle="Material Catalog (BOM)"
      topbarActions={
        <div className="flex items-center gap-3">
          <BomSearchButton />
          <BomNewButton />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <BomClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}
