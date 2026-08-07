import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RestaurantPosClientTable } from "./RestaurantPosClientTable";

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

export default function RestaurantPosPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("restaurant-pos");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("restaurant-pos")}
      topbarTitle={mod?.label ?? "Restaurant POS"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/restaurant-pos/new`} className="btn-accent">
          + New Order
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RestaurantPosClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

