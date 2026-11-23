import { notFound } from "next/navigation";
import { getWholesaleCustomer, listWholesaleOrders, listWholesaleProducts, customerOutstandingBalance, paiseToRupees } from "@/lib/wholesaleData";
import { verifyDealerPortalToken, createDealerReferralToken } from "@/lib/dealerPortal";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getWholesaleReferralProgram, listWholesaleReferralRewards } from "@/lib/wholesaleReferrals";
import { SITE_URL } from "@/lib/seo";
import { DealerOrderForm } from "./DealerOrderForm";

export const dynamic = "force-dynamic";

export default async function DealerPortalPage({ params }: { params: { token: string } }) {
  let claims: Awaited<ReturnType<typeof verifyDealerPortalToken>>;
  try { claims = await verifyDealerPortalToken(params.token); } catch { notFound(); }
  const customer = await getWholesaleCustomer(claims!.partnerId, claims!.customerId);
  if (!customer || !customer.isActive) notFound();
  const [allOrders, dispatches, products, tier, outstanding, program, rewards, partner] = await Promise.all([
    listWholesaleOrders(claims!.partnerId),
    listBusinessRecords(claims!.partnerId, "wholesale-dispatch"),
    listWholesaleProducts(claims!.partnerId, true),
    customer.defaultPriceTierId ? (await import("@/lib/prisma")).prisma.priceTier.findFirst({ where: { id: customer.defaultPriceTierId, partnerId: claims!.partnerId } }) : null,
    customerOutstandingBalance(claims!.partnerId, customer.id),
    getWholesaleReferralProgram(claims!.partnerId),
    listWholesaleReferralRewards(claims!.partnerId),
    (await import("@/lib/partnerData")).getPartner(claims!.partnerId),
  ]);
  const orders = allOrders.filter((order) => order.customerId === claims!.customerId).slice(0, 20);
  const tracking = new Map(dispatches.map((row) => [String(row.orderId), row]));
  const referralToken = program?.dealerPartnerTypeId ? await createDealerReferralToken({ partnerId: claims!.partnerId, referrerCustomerId: customer.id, partnerTypeId: program.dealerPartnerTypeId }) : null;
  const referralUrl = referralToken ? `${SITE_URL}/dealer-portal/refer/${referralToken}` : null;
  const ownRewards = rewards.filter((reward) => reward.referrerCustomerId === customer.id);
  return <main className="min-h-screen bg-bg p-4 text-text sm:p-6"><div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-xl border border-border bg-surface p-5"><p className="text-sm text-text-muted">Dealer portal{partner ? ` · ${partner.businessName}` : ""}</p><h1 className="mt-1 font-display text-2xl font-bold">Welcome, {customer.name}</h1><p className="mt-2 text-sm text-text-muted">View your orders, use your assigned pricing and place orders directly from the current catalogue.</p></header>
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs uppercase text-text-muted">Credit terms</p><p className="mt-1 font-semibold">{customer.creditTermDays ? `${customer.creditTermDays} days` : "Advance / as agreed"}</p></div><div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs uppercase text-text-muted">Credit limit</p><p className="mt-1 font-semibold">{customer.creditLimit ? `₹${paiseToRupees(customer.creditLimit).toLocaleString("en-IN")}` : "No limit set"}</p></div><div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs uppercase text-text-muted">Outstanding balance</p><p className="mt-1 font-semibold">₹{paiseToRupees(outstanding).toLocaleString("en-IN")}</p></div></section>
    <DealerOrderForm token={params.token} products={products.map((product) => ({ id: product.id, sku: product.sku, name: product.name, description: product.description, unit: product.unit, listPrice: product.listPrice, gstRateBps: product.gstRateBps, minimumQuantity: product.minimumQuantity }))} discountPercent={tier?.discountPercent ?? 0} />
    <section><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-display text-lg font-semibold">Recent orders</h2><p className="mt-1 text-sm text-text-muted">Latest 20 orders. Payments shown here are records maintained by the distributor.</p></div></div><div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-text-muted"><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Balance</th><th className="p-3">Status</th><th className="p-3">Delivery tracking</th><th className="p-3">Items</th></tr></thead><tbody>{orders.map((order) => { const item = tracking.get(order.id); return <tr key={order.id} className="border-b border-border last:border-0"><td className="p-3 font-medium">{order.orderNumber}</td><td className="p-3">{order.orderDate.toISOString().slice(0, 10)}</td><td className="p-3 text-right">₹{paiseToRupees(order.totalAmount).toFixed(2)}</td><td className="p-3 text-right">₹{paiseToRupees(order.paidAmount).toFixed(2)}</td><td className="p-3 text-right">₹{paiseToRupees(Math.max(0, order.totalAmount - order.paidAmount)).toFixed(2)}</td><td className="p-3">{order.status}</td><td className="p-3">{item ? `${String(item.carrier)} · ${String(item.trackingNumber)}` : "—"}</td><td className="p-3">{order.lines.map((line) => `${line.materialLabel} × ${line.quantity}`).join(", ")}</td></tr>; })}{orders.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-text-muted">No orders yet. Choose products above to place your first order.</td></tr>}</tbody></table></div></section>
    <section className="rounded-xl border border-teal/25 bg-teal/5 p-5"><h2 className="font-display text-lg font-semibold">Refer another dealer</h2><p className="mt-1 text-sm text-text-muted">{referralUrl ? `Share your private invitation link. The new dealer chooses an eligible plan, creates an independent account and completes subscription payment before access. ${program?.enabled ? `Your fixed reward is ₹${paiseToRupees(program.rewardAmount).toFixed(2)} after their first subscription payment is captured.` : "The distributor's referral incentive is currently disabled."}` : "The distributor needs to finish setting up its dealer account type and plans before referral links are available."}</p>{referralUrl && <div className="mt-3 flex flex-wrap gap-2"><a className="btn-accent" href={`https://wa.me/?text=${encodeURIComponent(`Apply for a dealer account with ${partner?.businessName ?? "our distributor"}: ${referralUrl}`)}`}>Share invitation on WhatsApp</a><a className="btn-outline" href={referralUrl}>Open plan invitation</a></div>}{ownRewards.length > 0 && <div className="mt-4"><h3 className="text-sm font-semibold">Your referrals</h3><ul className="mt-2 space-y-1 text-sm">{ownRewards.map((reward) => <li key={reward.id}>{reward.referred.name} · ₹{paiseToRupees(reward.rewardAmount).toFixed(2)} · {reward.status}</li>)}</ul></div>}</section>
    <footer className="text-center text-xs text-text-muted">This portal link is private and expires after 30 days. Contact the distributor if it expires or if your account/pricing needs an update.</footer>
  </div></main>;
}
