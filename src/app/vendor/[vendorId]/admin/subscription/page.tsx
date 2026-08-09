import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StatusChip } from "@/components/StatusChip";
import { DashboardWidget } from "@/components/DashboardWidget";
import { notFound } from "next/navigation";
import { getVendor } from "@/lib/vendorData";
import { getVendorType } from "@/lib/designer/vendorTypesData";
import { listPlans } from "@/lib/plansData";
import {
  getSubscriptionState,
  getOffer,
  computeVendorDueAmount,
  BILLING_CYCLES,
  cycleLabel,
  type BillingCycle,
} from "@/lib/subscriptionData";
import { chooseSubscriptionAction } from "./actions";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { env } from "@/lib/env";

registerPage({
  id: "subscription.vendor-view",
  moduleSlug: "platform",
  title: "Subscription — Vendor View",
  path: "/vendor/[vendorId]/admin/subscription",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Vendor-facing subscription page: Vendor Type, real trial countdown, and — once the Vendor Type bundles Plans — a plan + billing cycle picker with real computed pricing (src/lib/subscriptionData.ts). There is still no payment gateway wired up, so choosing a plan moves the vendor to \"PastDue\" (payment pending offline) rather than pretending a charge happened; a Super Admin confirms payment from /admin/subscribers.",
  sourceFile: "src/app/vendor/[vendorId]/admin/subscription/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function VendorSubscriptionPage({ params }: { params: { vendorId: string } }) {
  const vendor = await getVendor(params.vendorId);
  if (!vendor) notFound();
  const vendorType = await getVendorType(vendor.vendorTypeId);
  const subState = getSubscriptionState(vendor);
  const allPlans = await listPlans();
  const bundledPlans = allPlans.filter((p) => vendorType?.planIds.includes(p.id));
  const offer = vendor.offerId ? await getOffer(vendor.offerId) : undefined;
  const action = chooseSubscriptionAction.bind(null, vendor.id);
  const due = vendor.subscriptionStatus === "PastDue" ? await computeVendorDueAmount(vendor) : undefined;

  const statusVariant =
    subState.status === "Active" ? "success" : subState.status === "Trial" ? "warning" : subState.status === "Trial Expired" || subState.status === "PastDue" ? "danger" : "neutral";

  return (
    <AppShell topbarTitle="Subscription">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Subscription</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your account&apos;s Vendor Type, subscription status, and (once you convert off trial) billing cycle.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Vendor Type" value={vendorType?.id ?? vendor.vendorTypeId} />
          <DashboardWidget label="Vendor ID" value={vendor.id} />
          <DashboardWidget
            label="Subscription"
            value={subState.status}
            trend={
              subState.daysLeftInTrial !== null
                ? { direction: subState.isTrialExpired ? "down" : "up", label: `${subState.daysLeftInTrial} day(s) left` }
                : undefined
            }
          />
        </div>

        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-text">{vendorType?.id ?? vendor.vendorTypeId}</h2>
              {vendorType?.description && <p className="mt-1 text-sm text-text-muted">{vendorType.description}</p>}
            </div>
            <StatusChip label={subState.status} variant={statusVariant} />
          </div>

          {vendorType && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Modules enabled
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vendorType.defaultModules.map((slug) => (
                  <StatusChip key={slug} label={slug} variant="teal" />
                ))}
              </div>
            </div>
          )}
        </div>

        {vendor.subscriptionStatus === "Active" && vendor.planId && vendor.billingCycle && (
          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
            <h2 className="font-display text-base font-bold text-text">Your active plan</h2>
            <p className="mt-2 text-sm text-text">
              {allPlans.find((p) => p.id === vendor.planId)?.name ?? vendor.planId} —{" "}
              {cycleLabel(vendor.billingCycle as BillingCycle)}
            </p>
          </div>
        )}

        {vendor.subscriptionStatus === "PastDue" && (
          <div className="mt-6 rounded-lg border border-danger/40 bg-danger/5 p-5">
            <h2 className="font-display text-base font-bold text-text">Payment pending</h2>
            <p className="mt-2 text-sm text-text-muted">
              You&apos;ve chosen {allPlans.find((p) => p.id === vendor.planId)?.name ?? vendor.planId} (
              {cycleLabel((vendor.billingCycle as BillingCycle) ?? "Monthly")}).
              {offer ? ` Offer "${offer.name}" applied.` : ""}
            </p>
            <div className="mt-4">
              {due ? (
                <RazorpayCheckoutButton
                  vendorId={vendor.id}
                  vendorName={vendor.businessName}
                  vendorEmail={vendor.businessEmail}
                  vendorContact={vendor.businessContact}
                  amount={due.amount}
                  publicKeyId={env.razorpayPublicKeyId()}
                />
              ) : (
                <p className="text-xs text-text-muted">Could not compute an amount due — contact us to complete payment.</p>
              )}
            </div>
          </div>
        )}

        {(vendor.subscriptionStatus === "Trial" || subState.isTrialExpired) && (
          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
            <h2 className="font-display text-base font-bold text-text">Choose a plan to continue</h2>
            <p className="mt-1 text-sm text-text-muted">
              {subState.isTrialExpired
                ? "Your trial has ended — choose a plan and billing cycle to keep using My Biz Flow."
                : "You're currently on a free trial. Choose a plan and billing cycle any time to convert early."}
            </p>

            {bundledPlans.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Your Vendor Type has no Plans bundled yet — contact us to get pricing set up.
              </p>
            ) : (
              <form action={action} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {bundledPlans.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-text"
                    >
                      <input type="radio" name="planId" value={p.id} required className="mt-0.5 h-4 w-4 accent-accent" />
                      <span>
                        <span className="block font-semibold">{p.name}</span>
                        <span className="block text-xs text-text-muted">₹{p.price.toLocaleString("en-IN")}/mo base</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {BILLING_CYCLES.map((c) => (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-bg p-3 text-sm text-text"
                    >
                      <input type="radio" name="billingCycle" value={c} required className="h-4 w-4 accent-accent" />
                      {cycleLabel(c)}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  Pricing shown is monthly base — quarterly/half-yearly/yearly cycles carry a built-in discount for
                  committing longer, applied at checkout
                  {offer ? `, plus your active offer "${offer.name}"` : ""}.
                </p>
                <button type="submit" className="btn-accent">
                  Choose plan
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
