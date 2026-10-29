import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { formatCurrencyINR } from "@/lib/format";
import { listWholesaleCustomers, listWholesaleOrders, paiseToRupees } from "@/lib/wholesaleData";
import { listBusinessRecords } from "@/lib/businessRecords";
import { registerPage } from "@/lib/designer/registry";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";

registerPage({ id: "wholesale-b2b.analytics", moduleSlug: "wholesale-b2b", title: "Wholesale B2B — Analytics", path: "/partner/[partnerId]/wholesale-b2b/analytics", kind: "dashboard", superAdminOnly: false, customizableRegions: [], explanation: "Distributor dashboard covering order funnel, dealer exposure, sales, collections and stock health.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/analytics/page.tsx" });

export default async function WholesaleAnalyticsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const [orders, customers, invoices, payments, stock] = await Promise.all([
    listWholesaleOrders(params.partnerId), listWholesaleCustomers(params.partnerId), listBusinessRecords(params.partnerId, "billing"), listBusinessRecords(params.partnerId, "billing-payments"), listBusinessRecords(params.partnerId, "inventory-stock"),
  ]);
  const activeOrders = orders.filter((o) => !["Delivered", "Cancelled"].includes(o.status));
  const orderValue = orders.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + paiseToRupees(o.totalAmount), 0);
  const invoiced = invoices.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const collected = payments.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const outstanding = Math.max(0, invoiced - collected);
  const lowStock = stock.filter((r) => Number(r.availableQty ?? r.qtyOnHand ?? 0) <= Number(r.reorderLevel ?? 0)).length;
  const statusCounts = orders.reduce<Record<string, number>>((a, o) => { a[o.status] = (a[o.status] ?? 0) + 1; return a; }, {});
  return <AppShell topbarTitle="Wholesale / Distributor Analytics"><div className="mbf-page"><div className="border-b border-border bg-bg-raised px-6 py-4"><h1 className="font-display text-xl font-bold text-text">Distributor Dashboard</h1><p className="mt-1 text-sm text-text-muted">Orders, dealer exposure, collections and stock health.</p><Link href={`/partner/${params.partnerId}/wholesale-b2b`} className="mt-3 inline-block text-sm text-accent hover:underline">← Open wholesale orders</Link></div><div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4"><DashboardWidget label="Order value" value={formatCurrencyINR(orderValue)} /><DashboardWidget label="Active orders" value={String(activeOrders.length)} /><DashboardWidget label="Dealer accounts" value={String(customers.filter((c) => c.isActive).length)} /><DashboardWidget label="Outstanding" value={formatCurrencyINR(outstanding)} neon={outstanding > 0} /><DashboardWidget label="Invoiced" value={formatCurrencyINR(invoiced)} /><DashboardWidget label="Collected" value={formatCurrencyINR(collected)} /><DashboardWidget label="Low-stock materials" value={String(lowStock)} neon={lowStock > 0} /><DashboardWidget label="Total orders" value={String(orders.length)} /></div><div className="grid gap-4 px-6 pb-6 lg:grid-cols-2"><div className="card p-4"><h2 className="font-display text-sm font-bold text-text">Order funnel</h2><ul className="mt-3 space-y-2 text-sm">{Object.entries(statusCounts).map(([s, n]) => <li key={s} className="flex justify-between border-b border-border pb-1.5"><span className="text-text-muted">{s}</span><span className="font-semibold text-text">{n}</span></li>)}</ul></div><div className="card p-4"><h2 className="font-display text-sm font-bold text-text">Distributor actions</h2><div className="mt-3 flex flex-wrap gap-2"><Link href={`/partner/${params.partnerId}/wholesale-b2b/new`} className="btn-accent">New order</Link><Link href={`/partner/${params.partnerId}/wholesale-b2b/customers`} className="btn-outline">Dealer accounts</Link><Link href={`/partner/${params.partnerId}/wholesale-b2b/price-tiers`} className="btn-outline">Price tiers</Link><Link href={`/partner/${params.partnerId}/billing/reports/credit-accounts`} className="btn-outline">Credit exposure</Link><Link href={`/partner/${params.partnerId}/inventory/part-planning`} className="btn-outline">Stock planning</Link></div></div></div></div></AppShell>;
}
