import { AppShell } from "@/components/AppShell";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { listBusinessRecords } from "@/lib/businessRecords";
import { registerPage } from "@/lib/designer/registry";
import { listWholesaleOrders } from "@/lib/wholesaleData";

registerPage({ id: "wholesale-b2b.fulfilment", moduleSlug: "wholesale-b2b", title: "Warehouse Fulfilment Report", path: "/partner/[partnerId]/wholesale-b2b/fulfilment", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Order-level warehouse handoff report showing Picked and Packed stages with recorded timestamps. Read-only and separate from inventory mutations.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/fulfilment/page.tsx" });
export const dynamic = "force-dynamic";

export default async function WholesaleFulfilmentPage({ params }: { params: { partnerId: string } }) {
  const [orders, records] = await Promise.all([listWholesaleOrders(params.partnerId), listBusinessRecords(params.partnerId, "wholesale-fulfillment")]);
  const byOrder = new Map(records.map((record) => [String(record.orderId ?? ""), record]));
  const rows = orders.filter((order) => ["Confirmed", "Dispatched", "Delivered"].includes(order.status)).map((order) => ({ order, record: byOrder.get(order.id) }));
  const exportRows = rows.map(({ order, record }) => ({ orderNumber: order.orderNumber, customer: order.customerName, orderStatus: order.status, fulfilmentStage: String(record?.stage ?? "Awaiting pick"), recordedAt: String(record?.recordedAt ?? "") }));
  return <AppShell topbarTitle="Warehouse Fulfilment Report" topbarActions={<RecordCsvExportButton columns={["orderNumber", "customer", "orderStatus", "fulfilmentStage", "recordedAt"]} rows={exportRows} filename={`wholesale-fulfilment-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`} />}><div className="mbf-page space-y-6 p-6"><div><h1 className="font-display text-xl font-bold text-text">Warehouse Fulfilment Report</h1><p className="mt-1 text-sm text-text-muted">Track confirmed orders through picking and packing. This report does not reserve, deduct or adjust stock.</p></div><div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted"><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Order status</th><th className="p-3">Fulfilment</th><th className="p-3">Recorded</th></tr></thead><tbody>{rows.map(({ order, record }) => <tr key={order.id} className="border-b border-border last:border-0"><td className="p-3 font-medium">{order.orderNumber}</td><td className="p-3">{order.customerName}</td><td className="p-3">{order.status}</td><td className="p-3">{String(record?.stage ?? "Awaiting pick")}</td><td className="p-3 text-text-muted">{String(record?.recordedAt ?? "—")}</td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-text-muted">No open wholesale orders are available.</td></tr>}</tbody></table></div></div></AppShell>;
}
