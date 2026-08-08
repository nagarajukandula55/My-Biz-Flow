import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { LogisticsFleetClientTable } from "./LogisticsFleetClientTable";
import { LogisticsFleetNewButton } from "./LogisticsFleetNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { logisticsFleetColumns } from "@/lib/sample-data/logistics-fleet";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "logistics-fleet.list",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — List",
  path: "/vendor/[vendorId]/logistics-fleet",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every shipment record for the logistics-fleet module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/logistics-fleet/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LogisticsFleetPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("logistics-fleet");
  const columns = await applyCustomizations("logistics-fleet.list", logisticsFleetColumns);
  const rows = await listBusinessRecords(params.vendorId, "logistics-fleet");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Logistics / Fleet"}
      topbarActions={
        <LogisticsFleetNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LogisticsFleetClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

