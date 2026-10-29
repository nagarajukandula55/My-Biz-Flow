import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { WholesaleB2bClientTable } from "./WholesaleB2bClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { wholesaleB2bColumns } from "@/lib/sample-data/wholesale-b2b";
import { listWholesaleOrders, orderToRow } from "@/lib/wholesaleData";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";

registerPage({
  id: "wholesale-b2b.list",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — List",
  path: "/partner/[partnerId]/wholesale-b2b",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every WholesaleOrder (Prisma-backed) with its customer, price tier, order date, discounted total and status, with a \"+ New Order\" action and row-click navigation into the order's detail view.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WholesaleB2bPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("wholesale-b2b");
  const columns = await applyCustomizations("wholesale-b2b.list", wholesaleB2bColumns);
  const orders = await listWholesaleOrders(params.partnerId);
  const rows = orders.map(orderToRow);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Wholesale / Distributor B2B"}
      topbarActions={
        <div className="flex items-center gap-2"><RecordCsvExportButton columns={["orderNumber", "customerName", "orderDate", "status", "totalAmount"]} rows={orders.map(order => ({ orderNumber: order.orderNumber, customerName: order.customerName, orderDate: order.orderDate.toISOString().slice(0, 10), status: order.status, totalAmount: (order.totalAmount / 100).toFixed(2) }))} filename={`wholesale-orders-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`} /><Link href={`/partner/${params.partnerId}/wholesale-b2b/new`} className="btn-accent">+ New Order</Link></div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <WholesaleB2bClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
