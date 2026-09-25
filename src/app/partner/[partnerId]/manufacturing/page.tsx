import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ManufacturingClientTable, productionOrderColumns } from "./ManufacturingClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { listProductionOrders } from "@/lib/manufacturing";

registerPage({
  id: "manufacturing.list",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — List",
  path: "/partner/[partnerId]/manufacturing",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every ProductionOrder for this partner in a sortable table (real data — Prisma-backed: ProductionOrder, joined with its BillOfMaterial and WorkCenter), with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ManufacturingPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("manufacturing");
  const columns = await applyCustomizations("manufacturing.list", productionOrderColumns);
  const orders = await listProductionOrders(params.partnerId);
  const rows = orders.map((o) => ({
    id: o.id,
    productName: o.productName,
    bomProductName: o.bomProductName ?? "—",
    workCenterName: o.workCenterName ?? "—",
    quantityPlanned: o.quantityPlanned,
    quantityProduced: o.quantityProduced,
    plannedStartDate: o.plannedStartDate ? o.plannedStartDate.toISOString() : null,
    plannedEndDate: o.plannedEndDate ? o.plannedEndDate.toISOString() : null,
    status: o.status,
  }));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Manufacturing / Production"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/manufacturing/new`} className="btn-accent">
          + New Production Order
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ManufacturingClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
