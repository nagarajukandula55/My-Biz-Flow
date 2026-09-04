import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { PartOrdersClientTable } from "./PartOrdersClientTable";
import { PartOrdersNewButton } from "./PartOrdersNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { partOrderColumns } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.part-orders.list",
  moduleSlug: "inventory",
  title: "Part Orders — List",
  path: "/partner/[partnerId]/inventory/part-orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every part order (warehouse dispatching replacement material), with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/part-orders/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartOrdersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.part-orders.list", partOrderColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-part-orders");

  return (
    <AppShell
      topbarTitle="Part Orders"
      topbarActions={
        <PartOrdersNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <div className="mt-2">
          <PartOrdersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
