import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getPartner } from "@/lib/partnerData";
import { listPlans } from "@/lib/plansData";
import { listOffers, BILLING_CYCLES, cycleLabel } from "@/lib/subscriptionData";
import { updatePartnerSubscriptionAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.subscribers.subscription-edit",
  moduleSlug: "platform",
  title: "Subscribers — Subscription Editor",
  path: "/admin/subscribers/[partnerId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation:
    "Super Admin override of a partner's subscription: status, trial start/end dates, plan, billing cycle, and applied Offer. There is no payment gateway, so converting a partner from Trial/PastDue to Active once they've paid offline is done here manually.",
  sourceFile: "src/app/admin/(protected)/subscribers/[partnerId]/edit/page.tsx",
});

function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditPartnerSubscriptionPage({ params }: { params: { partnerId: string } }) {
  const partner = await getPartner(params.partnerId);
  if (!partner) notFound();
  const plans = await listPlans();
  const offers = await listOffers();
  const action = updatePartnerSubscriptionAction.bind(null, partner.id);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Subscription</h1>
          <Link href="/admin/subscribers" className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">
            {partner.id} — {partner.businessName}
          </p>
          <form action={action}>
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Subscription Status
                </label>
                <select
                  name="subscriptionStatus"
                  defaultValue={partner.subscriptionStatus}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="Trial">Trial</option>
                  <option value="Active">Active</option>
                  <option value="PastDue">Past Due (payment pending)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Trial Start
                  </label>
                  <input
                    name="trialStartAt"
                    type="date"
                    defaultValue={toDateInputValue(partner.trialStartAt)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Trial End
                  </label>
                  <input
                    name="trialEndAt"
                    type="date"
                    defaultValue={toDateInputValue(partner.trialEndAt)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Plan
                </label>
                <select
                  name="planId"
                  defaultValue={partner.planId ?? ""}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="">— None —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price.toLocaleString("en-IN")}/mo
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Billing Cycle
                </label>
                <select
                  name="billingCycle"
                  defaultValue={partner.billingCycle ?? ""}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="">— None (still on trial) —</option>
                  {BILLING_CYCLES.map((c) => (
                    <option key={c} value={c}>
                      {cycleLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Applied Offer
                </label>
                <select
                  name="offerId"
                  defaultValue={partner.offerId ?? ""}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="">— None —</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6">
              <button type="submit" className="btn-accent">
                Save changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperAdminGate>
  );
}
