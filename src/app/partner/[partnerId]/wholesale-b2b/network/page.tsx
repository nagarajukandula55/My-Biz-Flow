import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { prisma } from "@/lib/prisma";
import { listWholesaleOrders, paiseToRupees } from "@/lib/wholesaleData";
import { getPlan } from "@/lib/plansData";
import { registerPage } from "@/lib/designer/registry";

registerPage({ id: "wholesale-b2b.network", moduleSlug: "wholesale-b2b", title: "Dealer Network", path: "/partner/[partnerId]/wholesale-b2b/network", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Distributor-only view of dealer accounts enrolled through this distributor's invitation, subscription status, recent login, module activity and orders placed with this distributor.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/network/page.tsx" });
const CORE_TRACKED_MODULES = ["billing", "billing-payments", "inventory-stock", "inventory-stock-adjustments", "pos", "wholesale-b2b"];
const formatDate = (date?: Date | null) => date ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "Never";

export default async function WholesaleDealerNetworkPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") return <AppShell topbarTitle="Dealer Network"><div className="mbf-page p-6">Owner access is required.</div></AppShell>;
  const links = await prisma.distributorDealerRelationship.findMany({
    where: { distributorPartnerId: params.partnerId },
    include: { dealer: { select: { id: true, businessName: true, businessEmail: true, businessContact: true, status: true, subscriptionStatus: true, planId: true, billingCycle: true, lastLoginAt: true, createdAt: true } }, wholesaleCustomer: { select: { id: true, name: true, isActive: true } } },
    orderBy: { createdAt: "desc" },
  });
  const childIds = links.map((item) => item.dealerPartnerId);
  const customerIds = links.map((item) => item.wholesaleCustomerId);
  const [activity, distributorOrders] = childIds.length ? await Promise.all([
    prisma.businessRecord.groupBy({ by: ["partnerId", "moduleSlug"], where: { partnerId: { in: childIds }, moduleSlug: { in: CORE_TRACKED_MODULES } }, _count: { _all: true }, _max: { createdAt: true } }),
    listWholesaleOrders(params.partnerId),
  ]) : [[], []];
  const activityByDealer = new Map<string, typeof activity>();
  for (const row of activity) activityByDealer.set(row.partnerId, [...(activityByDealer.get(row.partnerId) ?? []), row]);
  const ordersByCustomer = new Map<string, typeof distributorOrders>();
  for (const order of distributorOrders) ordersByCustomer.set(order.customerId, [...(ordersByCustomer.get(order.customerId) ?? []), order]);
  const plans = await Promise.all(links.map((item) => item.dealer.planId ? getPlan(item.dealer.planId) : undefined));
  const paidAccounts = links.filter((item) => item.dealer.subscriptionStatus === "Active").length;
  return <AppShell topbarTitle="Dealer Network"><div className="mbf-page space-y-6 p-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Enrolled dealer network</h1><p className="mt-1 max-w-3xl text-sm text-text-muted">This private view includes only dealer workspaces enrolled through this distributor. Dealers can use the modules in their own paid plan for selling, stock receipts and adjustments, inventory and billing. Unregistered dealers remain ordinary distributor-managed customers; their orders and fulfilment stay in your existing workflow.</p></div><Link className="btn-accent" href={`/partner/${params.partnerId}/wholesale-b2b/portal-links`}>Invite or refer a dealer</Link></header>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs uppercase text-text-muted">Enrolled dealers</p><p className="mt-1 text-2xl font-bold">{links.length}</p></div><div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs uppercase text-text-muted">Paid and active</p><p className="mt-1 text-2xl font-bold">{paidAccounts}</p></div><div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs uppercase text-text-muted">Subscription payment pending</p><p className="mt-1 text-2xl font-bold">{links.length - paidAccounts}</p></div></div>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full min-w-[1120px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-text-muted"><th className="p-3">Dealer business</th><th className="p-3">Plan / subscription</th><th className="p-3">Last login</th><th className="p-3">Distributor sales</th><th className="p-3">Dealer workspace activity</th><th className="p-3">Relationship</th></tr></thead><tbody>{links.map((item, index) => { const orders = ordersByCustomer.get(item.wholesaleCustomerId) ?? []; const totalPurchases = orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + order.totalAmount, 0); const moduleRows = activityByDealer.get(item.dealerPartnerId) ?? []; return <tr key={item.id} className="border-b border-border align-top last:border-0"><td className="p-3"><strong>{item.dealer.businessName}</strong><span className="block text-xs text-text-muted">{item.dealer.id} · {item.dealer.businessContact}</span><span className="block text-xs text-text-muted">{item.dealer.businessEmail}</span><span className="block text-xs text-text-muted">Registered {formatDate(item.dealer.createdAt)}</span></td><td className="p-3">{plans[index]?.name ?? "Plan not set"}<span className="block text-xs text-text-muted">{item.dealer.subscriptionStatus}{item.dealer.billingCycle ? ` · ${item.dealer.billingCycle}` : ""}</span><span className="block text-xs text-text-muted">Account {item.dealer.status}</span></td><td className="p-3">{formatDate(item.dealer.lastLoginAt)}</td><td className="p-3">{orders.length} orders<span className="block text-xs text-text-muted">Value ₹{paiseToRupees(totalPurchases).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span><span className="block text-xs text-text-muted">Dealer record: {item.wholesaleCustomer.name}{!item.wholesaleCustomer.isActive ? " (inactive)" : ""}</span></td><td className="p-3">{moduleRows.length ? moduleRows.map((row) => <span key={row.moduleSlug} className="mb-1 mr-1 inline-flex rounded-full bg-bg-raised px-2 py-1 text-xs">{row.moduleSlug}: {row._count._all}</span>) : <span className="text-xs text-text-muted">No recent records in tracked modules</span>}</td><td className="p-3">{item.status}<span className="block text-xs text-text-muted">Linked {formatDate(item.createdAt)}</span></td></tr>; })}{links.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-text-muted">No independent dealer accounts are linked yet. You can keep adding and servicing dealers manually, or send a plan invitation when a dealer is ready to join.</td></tr>}</tbody></table></div>
    <p className="text-xs text-text-muted">Activity counts show records in the dealer workspace’s shared Billing, Inventory, POS and Wholesale modules. Transactions between this distributor and a linked dealer remain recorded in this distributor’s own orders and fulfilment views.</p>
  </div></AppShell>;
}
