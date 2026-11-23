import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { prisma } from "@/lib/prisma";
import { createDealerPortalToken } from "@/lib/dealerPortal";
import { getWarehouseOptionsForPartner } from "@/lib/sample-data/warehouse";
import { paiseToRupees } from "@/lib/wholesaleData";
import { createMyDealerReferralLinkAction, receiveDealerPurchaseAction } from "./actions";

registerPage({ id: "wholesale-b2b.purchases", moduleSlug: "wholesale-b2b", title: "My Distributor Purchases", path: "/partner/[partnerId]/wholesale-b2b/purchases", kind: "list", superAdminOnly: false, customizableRegions: [{ key: "purchase-columns", label: "Purchase list columns" }], explanation: "Dealer-side view of POs from its linked distributor, including order entry, shipment progress, warehouse receipt and referral link generation.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/purchases/page.tsx" });

export default async function DealerPurchasesPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { referral?: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") notFound();
  const relationship = await prisma.distributorDealerRelationship.findUnique({ where: { dealerPartnerId: params.partnerId }, include: { distributor: { select: { businessName: true } } } });
  if (!relationship) return <AppShell topbarTitle="Dealer Purchases & Referrals"><div className="mbf-page p-6"><h1 className="font-display text-2xl font-bold">Dealer purchases & referrals</h1><p className="mt-2 text-sm text-text-muted">This page becomes the dealer-side purchase and referral workspace for accounts enrolled under a distributor.</p><Link href={`/partner/${params.partnerId}/wholesale-b2b`} className="btn-outline mt-4">Open distributor orders</Link></div></AppShell>;
  const [orders, warehouses] = await Promise.all([
    prisma.wholesaleOrder.findMany({ where: { partnerId: relationship.distributorPartnerId, customerId: relationship.wholesaleCustomerId }, include: { lines: true, payments: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    getWarehouseOptionsForPartner(params.partnerId),
  ]);
  const orderPortalToken = await createDealerPortalToken({ partnerId: relationship.distributorPartnerId, customerId: relationship.wholesaleCustomerId });
  return <AppShell topbarTitle="My Distributor Purchases"><div className="mbf-page space-y-6 p-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Purchases from {relationship.distributor.businessName}</h1><p className="mt-1 text-sm text-text-muted">Raise a PO, follow each fulfilment step, and receive delivered stock into your selected warehouse.</p></div><Link className="btn-accent" href={`/dealer-portal/${orderPortalToken}`}>Raise new PO</Link></header>
    <section className="rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-lg font-bold">Refer another dealer or POS business</h2><p className="mt-1 text-sm text-text-muted">When the referred business buys its first plan successfully, you earn 5% of that captured plan payment. Renewals do not repeat the reward.</p><form action={createMyDealerReferralLinkAction.bind(null, params.partnerId)} className="mt-3"><button className="btn-outline">Generate my referral link</button></form>{searchParams?.referral && <p className="mt-3 break-all rounded-lg border border-teal/30 bg-teal-soft p-3 text-sm">{searchParams.referral}</p>}</section>
    <section className="space-y-3">{orders.map((order) => { const paid = order.payments.reduce((sum, payment) => sum + payment.amount, 0); return <article key={order.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap justify-between gap-3"><div><strong>{order.orderNumber}</strong><span className="ml-2"><StatusChip label={order.status} variant={order.status === "Received" ? "success" : order.status === "Cancelled" ? "danger" : "teal"} /></span><p className="mt-1 text-sm text-text-muted">{order.lines.length} product line(s) · ₹{paiseToRupees(order.totalAmount).toFixed(2)} · Paid ₹{paiseToRupees(paid).toFixed(2)}</p></div>{order.status === "Delivered" && <form action={receiveDealerPurchaseAction.bind(null, params.partnerId, order.id)} className="flex flex-wrap items-end gap-2"><label className="text-sm">Receive into warehouse<select name="warehouseId" required className="input mt-1 min-w-52"><option value="">Select</option>{warehouses.map((warehouse)=><option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>)}</select></label><button className="btn-accent">Confirm receipt</button></form>}</div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b border-border text-left"><th className="p-2">Product</th><th className="p-2 text-right">Requested</th><th className="p-2 text-right">Allocated</th><th className="p-2 text-right">Shipped</th><th className="p-2 text-right">Received</th></tr></thead><tbody>{order.lines.map((line)=><tr key={line.id} className="border-b border-border last:border-0"><td className="p-2">{line.materialLabel}</td>{[line.quantity,line.allocatedQuantity,line.shippedQuantity,line.receivedQuantity].map((value,index)=><td key={index} className="p-2 text-right font-mono tabular-nums">{value}</td>)}</tr>)}</tbody></table></div></article>; })}{!orders.length && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-text-muted">No purchase orders yet.</p>}</section>
  </div></AppShell>;
}
