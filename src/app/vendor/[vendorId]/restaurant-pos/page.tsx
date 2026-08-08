import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RestaurantPosClientTable } from "./RestaurantPosClientTable";
import { RestaurantPosNewButton } from "./RestaurantPosNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { restaurantPosColumns } from "@/lib/sample-data/restaurant-pos";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "restaurant-pos.list",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — List",
  path: "/vendor/[vendorId]/restaurant-pos",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every order record for the restaurant-pos module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/restaurant-pos/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantPosPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("restaurant-pos");
  const columns = await applyCustomizations("restaurant-pos.list", restaurantPosColumns);
  const rows = await listBusinessRecords(params.vendorId, "restaurant-pos");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Restaurant POS"}
      topbarActions={
        <RestaurantPosNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RestaurantPosClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

