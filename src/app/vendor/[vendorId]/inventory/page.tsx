import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { InventoryClientTable } from "./InventoryClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { inventoryColumns } from "@/lib/sample-data/inventory";

registerPage({
  id: "inventory.list",
  moduleSlug: "inventory",
  title: "Inventory / Warehouse — List",
  path: "/vendor/[vendorId]/inventory",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every stock item record for the inventory module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/page.tsx",
});

export default function InventoryPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("inventory");
  const columns = applyCustomizations("inventory.list", inventoryColumns);

  return (
    <AppShell
      navGroups={buildVendorNavGroups("inventory")}
      topbarTitle={mod?.label ?? "Inventory / Warehouse"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/inventory/new`} className="btn-accent">
          + New Stock Item
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <InventoryClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

