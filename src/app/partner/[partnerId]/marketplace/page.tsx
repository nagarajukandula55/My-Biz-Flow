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
  title: "Marketplace / Partner Aggregator — List",
  path: "/partner/[partnerId]/marketplace",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every partner listing record for the marketplace module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("marketplace");
  const columns = await applyCustomizations("marketplace.list", marketplaceColumns);
  const rows = await listBusinessRecords(params.partnerId, "marketplace");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Marketplace / Partner Aggregator"}
      topbarActions={
        <MarketplaceNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <MarketplaceClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

