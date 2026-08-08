import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { ReturnOrdersClientTable } from "./ReturnOrdersClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { returnOrderColumns } from "@/lib/sample-data/warehouse";

registerPage({
  id: "inventory.return-orders.list",
  moduleSlug: "inventory",
  title: "Return Orders — List",
  path: "/vendor/[vendorId]/inventory/return-orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every return order (defective/good material back to the mapped warehouse), with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/return-orders/page.tsx",
});

export default async function ReturnOrdersPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("inventory.return-orders.list", returnOrderColumns);

  return (
    <AppShell
      topbarTitle="Return Orders"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/inventory/return-orders/new`} className="btn-accent">
          + New Return Order
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <ReturnOrdersClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}
