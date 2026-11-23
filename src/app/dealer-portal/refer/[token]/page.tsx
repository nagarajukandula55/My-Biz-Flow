import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyDealerReferralToken } from "@/lib/dealerPortal";
import { getPartner } from "@/lib/partnerData";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { getPlan } from "@/lib/plansData";
import { getWholesaleCustomer } from "@/lib/wholesaleData";
import { getWholesaleReferralProgram } from "@/lib/wholesaleReferrals";

const CORE = ["wholesale-b2b", "inventory", "pos", "billing"];

export default async function DealerReferralSignupPage({ params, searchParams }: { params: { token: string }; searchParams?: { error?: string } }) {
  let claims: Awaited<ReturnType<typeof verifyDealerReferralToken>>;
  try { claims = await verifyDealerReferralToken(params.token); } catch { notFound(); }
  const [referrer, distributor, program, partnerType] = await Promise.all([
    claims!.referrerCustomerId ? getWholesaleCustomer(claims!.partnerId, claims!.referrerCustomerId) : Promise.resolve(null),
    getPartner(claims!.partnerId), getWholesaleReferralProgram(claims!.partnerId), getPartnerType(claims!.partnerTypeId),
  ]);
  if ((claims!.referrerCustomerId ? !referrer?.isActive : false) || !distributor || distributor.status !== "Active" || !program || program.dealerPartnerTypeId !== claims!.partnerTypeId || !partnerType || partnerType.status !== "Active") notFound();
  const plans = (await Promise.all(partnerType.planIds.map((id) => getPlan(id)))).filter((plan) => plan?.isPublic && CORE.every((module) => plan.includedModuleSlugs.includes(module)));
  const referralName = referrer?.name ?? distributor.businessName;
  return <main className="min-h-screen bg-bg p-4 text-text sm:p-6"><div className="space-y-6">
    <header className="rounded-xl border border-border bg-surface p-6"><p className="text-sm text-text-muted">Dealer / POS business invitation · Referred by {referralName}</p><h1 className="mt-2 font-display text-2xl font-bold">Choose your My Biz Flow plan</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">Your independent workspace includes the modules in the selected plan. Inventory, serialized stock, POS sales, billing, adjustments and staff access remain inside your own account.</p>{searchParams?.error && <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-danger">The dealer plan setup changed or the invitation is invalid. Contact the distributor.</p>}</header>
    <section className="rounded-xl border border-teal/30 bg-teal-soft p-4 text-sm">After your first plan payment is captured successfully, {referralName} earns exactly 5% of that payment. Renewals do not generate another reward.</section>
    {plans.length ? <section className="grid gap-4 md:grid-cols-2">{plans.map((plan) => <article key={plan!.id} className="flex flex-col rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl font-bold">{plan!.name}</h2><p className="mt-2 font-mono text-2xl font-bold tabular-nums">₹{plan!.price.toLocaleString("en-IN")}<span className="font-sans text-sm font-normal text-text-muted"> / month base</span></p><p className="mt-1 text-sm text-text-muted">Annual or two-year billing is chosen before payment; GST is added at checkout.</p><div className="mt-4 flex flex-wrap gap-2">{plan!.includedModuleSlugs.map((slug)=><span key={slug} className="rounded-full bg-bg-raised px-2.5 py-1 text-xs">{slug}</span>)}</div><Link href={`/signup/${encodeURIComponent(partnerType.id)}?planId=${encodeURIComponent(plan!.id)}&dealerInvite=${encodeURIComponent(params.token)}`} className="btn-accent mt-5 justify-center">Choose {plan!.name}</Link></article>)}</section> : <p className="rounded-xl border border-dashed border-border p-6 text-sm text-text-muted">No eligible public dealer plan is available yet.</p>}
  </div></main>;
}
