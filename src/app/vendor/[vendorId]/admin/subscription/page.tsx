import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StatusChip } from "@/components/StatusChip";
import { DashboardWidget } from "@/components/DashboardWidget";
import { getModule } from "@/lib/designer/moduleRegistry";
import { getPlan } from "@/lib/sample-data/plans";
import { getSubscriber } from "@/lib/sample-data/subscribers";

registerPage({
  id: "subscription.vendor-view",
  moduleSlug: "platform",
  title: "Subscription — Vendor View",
  path: "/vendor/[vendorId]/admin/subscription",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Vendor-facing subscription summary: current plan, modules included, seat usage vs. plan limit, and an 'Upgrade plan' CTA back to /pricing. Documented routing note: this lives under /admin/subscription rather than at /vendor/[vendorId]/billing, because 'billing' was already taken by the existing Billing module's own invoicing pages — this view is about the vendor's OWN platform subscription, a different concept from the Billing module (customer invoicing). Also documented rather than folded into /settings, since it's state ABOUT the account (what you're paying for) rather than configuration OF the account.",
  sourceFile: "src/app/vendor/[vendorId]/admin/subscription/page.tsx",
});

export default async function VendorSubscriptionPage({ params }: { params: { vendorId: string } }) {
  const subscriber = getSubscriber(params.vendorId);
  const plan = getPlan(String(subscriber["plan"])) ?? getPlan("pro")!;
  const seatsUsed = Number(subscriber["seats"] ?? 0);
  const seatPct = Math.min(100, Math.round((seatsUsed / plan.maxUsers) * 100));
  const moduleLabels = new Map(
    await Promise.all(
      plan.includedModuleSlugs.map(async (slug) => [slug, (await getModule(slug))?.label ?? slug] as const)
    )
  );

  return (
    <AppShell topbarTitle="Subscription">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Subscription</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your platform subscription — not to be confused with the Billing module (customer invoicing) in the
          sidebar. Sample data — no real payment gateway or billing engine is wired up (see /subscribe for the demo
          checkout stub).
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Current Plan" value={plan.name} />
          <DashboardWidget label="Seats Used" value={`${seatsUsed} / ${plan.maxUsers}`} />
          <DashboardWidget label="Status" value={String(subscriber["status"])} />
        </div>

        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-text">{plan.name} plan</h2>
              <p className="mt-1 text-sm text-text-muted">
                ₹{plan.price.toLocaleString("en-IN")} / {plan.billingCycle} · up to {plan.maxLocations} location
                {plan.maxLocations === 1 ? "" : "s"}
              </p>
            </div>
            <StatusChip
              label={String(subscriber["status"])}
              variant={subscriber["status"] === "active" ? "success" : subscriber["status"] === "trial" ? "teal" : "danger"}
            />
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide text-text-muted">
              <span>Seat usage</span>
              <span>{seatPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-sunken">
              <div className="h-full rounded-full bg-accent" style={{ width: `${seatPct}%` }} />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Modules included
            </div>
            <div className="flex flex-wrap gap-1.5">
              {plan.includedModuleSlugs.map((slug) => (
                <StatusChip key={slug} label={moduleLabels.get(slug) ?? slug} variant="teal" />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Link href="/pricing" className="btn-accent">
              Upgrade plan
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
