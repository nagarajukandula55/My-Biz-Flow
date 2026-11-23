import { AppShell } from "@/components/AppShell";
import { listWholesaleCustomers } from "@/lib/wholesaleData";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getWholesaleReferralProgram } from "@/lib/wholesaleReferrals";
import { registerPage } from "@/lib/designer/registry";
import { createDealerPortalLinkAction, createDealerReferralLinkAction, createDirectDealerInviteAction } from "./actions";

registerPage({ id: "wholesale-b2b.portal-links", moduleSlug: "wholesale-b2b", title: "Dealer Portal Links", path: "/partner/[partnerId]/wholesale-b2b/portal-links", kind: "list", superAdminOnly: false, customizableRegions: [{ key: "dealer-actions", label: "Dealer link actions" }], explanation: "Issues tenant-scoped dealer ordering links, direct distributor invitations and dealer-attributed plan referral links.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/portal-links/page.tsx" });

export default async function DealerPortalLinksPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { link?: string; referral?: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") return <AppShell topbarTitle="Dealer Links"><div className="mbf-page p-6">Owner access is required.</div></AppShell>;
  const [customers, program] = await Promise.all([listWholesaleCustomers(params.partnerId), getWholesaleReferralProgram(params.partnerId)]);
  const activeCustomers = customers.filter((customer) => customer.isActive);
  return <AppShell topbarTitle="Dealer Access & Referrals"><div className="mbf-page space-y-6 p-6">
    <header><h1 className="font-display text-2xl font-bold">Dealer access & referral links</h1><p className="mt-1 text-sm text-text-muted">Invite a dealer directly or attribute the invitation to an existing dealer. The new dealer chooses and pays for an eligible plan before workspace access.</p></header>
    {searchParams?.link && <p className="break-all rounded-lg border border-teal/30 bg-teal-soft p-3 text-sm">Dealer ordering link: {searchParams.link}</p>}
    {searchParams?.referral && <p className="break-all rounded-lg border border-teal/30 bg-teal-soft p-3 text-sm">Plan invitation link: {searchParams.referral}</p>}
    <section className="rounded-xl border border-border bg-bg-raised p-4"><p className="text-sm">{program?.enabled ? "Referral reward: 5% of the referred dealer's first successfully captured plan payment. Direct invitations reward the distributor; dealer links reward that dealer." : "Referral rewards are disabled. You may still issue ordering links."}</p>{program?.dealerPartnerTypeId && <form className="mt-3" action={createDirectDealerInviteAction.bind(null, params.partnerId)}><button className="btn-accent">Generate direct distributor invite</button></form>}</section>
    <section className="space-y-3">{activeCustomers.map((customer) => <article key={customer.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{customer.name}</h2><p className="text-sm text-text-muted">{customer.contact || "No contact"}{customer.email ? ` · ${customer.email}` : ""}</p><p className="mt-1 text-xs text-text-muted">Dealer code: {customer.referralCode ?? "-"}</p></div><div className="flex flex-wrap gap-2"><form action={createDealerPortalLinkAction.bind(null, params.partnerId)}><input type="hidden" name="customerId" value={customer.id} /><button className="btn-outline">Generate ordering link</button></form>{program?.dealerPartnerTypeId && <form action={createDealerReferralLinkAction.bind(null, params.partnerId)}><input type="hidden" name="customerId" value={customer.id} /><button className="btn-accent">Generate this dealer&apos;s referral link</button></form>}</div></div></article>)}{!activeCustomers.length && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-text-muted">No active dealer customers yet.</p>}</section>
  </div></AppShell>;
}
