import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { PartOrdersClientTable } from "./PartOrdersClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { partOrderColumns } from "@/lib/sample-data/warehouse";

registerPage({
  id: "inventory.part-orders.list",
  moduleSlug: "inventory",
  title: "Part Orders — List",
  path: "/vendor/[vendorId]/inventory/part-orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every part order (warehouse dispatching replacement material), with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/part-orders/page.tsx",
});

export default async function PartOrdersPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("inventory.part-orders.list", partOrderColumns);

  return (
    <AppShell
      topbarTitle="Part Orders"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/inventory/part-orders/new`} className="btn-accent">
          + New Part Order
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <PartOrdersClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}
