import Link from "next/link";
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
  path: "/partner/[partnerId]/restaurant-pos",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every order record for the restaurant-pos module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantPosPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("restaurant-pos");
  const columns = await applyCustomizations("restaurant-pos.list", restaurantPosColumns);
  const rows = await listBusinessRecords(params.partnerId, "restaurant-pos");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Restaurant POS"}
      topbarActions={
        <div className="flex items-center gap-3">
          <Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="btn-outline">
            Table Floor
          </Link>
          <RestaurantPosNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          {mod?.description} Live KOTs and table carts are managed from the{" "}
          <Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="text-accent hover:underline">
            Table Floor
          </Link>
          . This list is the historical order log.
        </p>
        <div className="mt-6">
          <RestaurantPosClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

