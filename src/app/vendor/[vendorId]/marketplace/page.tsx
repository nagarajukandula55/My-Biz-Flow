import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { MarketplaceClientTable } from "./MarketplaceClientTable";
import { MarketplaceNewButton } from "./MarketplaceNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { marketplaceColumns } from "@/lib/sample-data/marketplace";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "marketplace.list",
  moduleSlug: "marketplace",
  title: "Marketplace / Vendor Aggregator — List",
  path: "/vendor/[vendorId]/marketplace",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every vendor listing record for the marketplace module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/marketplace/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("marketplace");
  const columns = await applyCustomizations("marketplace.list", marketplaceColumns);
  const rows = await listBusinessRecords(params.vendorId, "marketplace");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Marketplace / Vendor Aggregator"}
      topbarActions={
        <MarketplaceNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <MarketplaceClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

