import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { registerPage } from "@/lib/designer/registry";
import { listWholesaleOrders } from "@/lib/wholesaleData";

registerPage({ id: "wholesale-b2b.pick-list", moduleSlug: "wholesale-b2b", title: "Warehouse Pick List", path: "/partner/[partnerId]/wholesale-b2b/pick-list", kind: "list", superAdminOnly: false, customizableRegions: [{ key: "pick-columns", label: "Pick list columns" }], explanation: "Aggregates remaining allocated quantities from POs in the Picking stage and links warehouse users to the enforced serial-aware picking action.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/pick-list/page.tsx" });
export const dynamic = "force-dynamic";

export default async function WholesalePickListPage({ params }: { params: { partnerId: string } }) {
  const orders = (await listWholesaleOrders(params.partnerId)).filter((order) => order.status === "Picking");
  const materials = new Map<string, { label: string; quantity: number; orders: string[] }>();
  for (const order of orders) for (const line of order.lines) {
    const remaining = Math.max(0, line.allocatedQuantity - line.pickedQuantity);
    if (!remaining) continue;
    const current = materials.get(line.materialId) ?? { label: line.materialLabel, quantity: 0, orders: [] };
    current.quantity += remaining; current.orders.push(order.orderNumber); materials.set(line.materialId, current);
  }
  const rows = [...materials.entries()].map(([materialId, item]) => ({ materialId, material: item.label, quantityToPick: item.quantity, orders: item.orders.join(", ") }));
  return <AppShell topbarTitle="Warehouse Pick List" topbarActions={<RecordCsvExportButton columns={["materialId","material","quantityToPick","orders"]} rows={rows} filename={`wholesale-pick-list-${params.partnerId}.csv`} />}><div className="space-y-6"><div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><DashboardWidget label="POs in picking" value={String(orders.length)} /><DashboardWidget label="Materials" value={String(materials.size)} /><DashboardWidget label="Units remaining" value={String(rows.reduce((sum,row)=>sum+row.quantityToPick,0))} /></div><div className="overflow-x-auto rounded-xl border border-border bg-bg-raised"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left"><th className="p-3">Material</th><th className="p-3 text-right">Remaining</th><th className="p-3">POs</th></tr></thead><tbody>{rows.map((row)=><tr key={row.materialId} className="border-b border-border last:border-0"><td className="p-3">{row.material}</td><td className="p-3 text-right font-mono tabular-nums">{row.quantityToPick}</td><td className="p-3">{row.orders}</td></tr>)}{!rows.length && <tr><td colSpan={3} className="p-6 text-center text-text-muted">No allocated items are waiting to be picked.</td></tr>}</tbody></table></div><div className="space-y-2">{orders.map((order)=><div key={order.id} className="flex flex-wrap items-center justify-between rounded-xl border border-border bg-surface p-4"><div><strong>{order.orderNumber}</strong><span className="ml-2 text-sm text-text-muted">{order.customerName} · {order.warehouseName}</span></div><Link href={`/partner/${params.partnerId}/wholesale-b2b/${order.id}`} className="btn-outline">Open picking</Link></div>)}</div></div></AppShell>;
}
