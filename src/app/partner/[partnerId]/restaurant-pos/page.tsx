import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RestaurantPosClientTable } from "./RestaurantPosClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { restaurantPosColumns } from "@/lib/sample-data/restaurant-pos";
import { listOrdersForPartner } from "@/lib/restaurantPos/data";

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
  explanation: "Lists persistent restaurant order history. New orders start from a configurable service point such as a table, hut, cabin, or room.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantPosPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { page?: string } }) {
  const mod = await getModule("restaurant-pos");
  const columns = await applyCustomizations("restaurant-pos.list", restaurantPosColumns);
  const result = await listOrdersForPartner(params.partnerId, Number(searchParams?.page ?? 1));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Restaurant POS"}
      topbarActions={
        <div className="flex items-center gap-3">
          <Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="btn-outline">
            Order Locations
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          {mod?.description} Service-point orders and optional kitchen tickets are managed from the{" "}
          <Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="text-accent hover:underline">
            Order Locations
          </Link>
          . This list is the historical order log.
        </p>
        <div className="mt-6">
          <RestaurantPosClientTable partnerId={params.partnerId} columns={columns} rows={result.rows} />
        </div>
        <nav className="mt-4 flex flex-wrap gap-3" aria-label="Order history pages">
          {result.page > 1 && <Link className="btn-outline min-h-11" href={`/partner/${params.partnerId}/restaurant-pos?page=${result.page - 1}`}>Previous</Link>}
          {result.hasNext && <Link className="btn-outline min-h-11" href={`/partner/${params.partnerId}/restaurant-pos?page=${result.page + 1}`}>Next</Link>}
        </nav>
      </div>
    </AppShell>
  );
}

