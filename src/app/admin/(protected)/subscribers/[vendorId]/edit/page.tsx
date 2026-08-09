import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getVendor } from "@/lib/vendorData";
import { listPlans } from "@/lib/plansData";
import { listOffers, BILLING_CYCLES, cycleLabel } from "@/lib/subscriptionData";
import { updateVendorSubscriptionAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.subscribers.subscription-edit",
  moduleSlug: "platform",
  title: "Subscribers — Subscription Editor",
  path: "/admin/subscribers/[vendorId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation:
    "Super Admin override of a vendor's subscription: status, trial start/end dates, plan, billing cycle, and applied Offer. There is no payment gateway, so converting a vendor from Trial/PastDue to Active once they've paid offline is done here manually.",
  sourceFile: "src/app/admin/(protected)/subscribers/[vendorId]/edit/page.tsx",
});

function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditVendorSubscriptionPage({ params }: { params: { vendorId: string } }) {
  const vendor = await getVendor(params.vendorId);
  if (!vendor) notFound();
  const plans = await listPlans();
  const offers = await listOffers();
  const action = updateVendorSubscriptionAction.bind(null, vendor.id);

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
            {vendor.id} — {vendor.businessName}
          </p>
          <form action={action}>
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Subscription Status
                </label>
                <select
                  name="subscriptionStatus"
                  defaultValue={vendor.subscriptionStatus}
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
                    defaultValue={toDateInputValue(vendor.trialStartAt)}
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
                    defaultValue={toDateInputValue(vendor.trialEndAt)}
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
                  defaultValue={vendor.planId ?? ""}
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
                  defaultValue={vendor.billingCycle ?? ""}
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
                  defaultValue={vendor.offerId ?? ""}
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
