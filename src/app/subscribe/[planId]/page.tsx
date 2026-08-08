import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { getPlan } from "@/lib/sample-data/plans";
import { getModule } from "@/lib/designer/moduleRegistry";
import { SubscribeForm } from "./SubscribeForm";

registerPage({
  id: "platform.subscribe",
  moduleSlug: "platform",
  title: "Subscribe — Demo Checkout",
  path: "/subscribe/[planId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Honest demo checkout stub — no real payment gateway account/keys exist for this project. Shows the chosen plan's price/details, a name/email form, and a clearly-labeled 'Simulate payment' button that shows a demo success state. No stripe/razorpay dependency, no placeholder API keys.",
  sourceFile: "src/app/subscribe/[planId]/page.tsx",
});

export default function SubscribePage({ params }: { params: { planId: string } }) {
  const plan = getPlan(params.planId);

  if (!plan) {
    return (
      <div className="mbf-page flex min-h-screen w-full items-center justify-center bg-bg px-6">
        <div className="text-center">
          <p className="text-text-muted">Unknown plan &quot;{params.planId}&quot;.</p>
          <Link href="/pricing" className="mt-3 inline-block font-semibold text-teal hover:underline">
            Back to pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mbf-page flex min-h-screen w-full justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>

        <div className="rounded-lg border border-border bg-bg-raised p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Subscribing to</div>
          <h1 className="mt-1 font-display text-2xl font-bold text-text">{plan.name}</h1>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-text">
            ₹{plan.price.toLocaleString("en-IN")}
            <span className="text-sm font-normal text-text-muted"> / {plan.billingCycle}</span>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            {plan.includedModuleSlugs.length} modules · up to {plan.maxUsers} users ·{" "}
            {plan.maxLocations} location{plan.maxLocations === 1 ? "" : "s"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {plan.includedModuleSlugs.slice(0, 6).map((slug) => (
              <span key={slug} className="rounded-full bg-teal-soft px-2 py-0.5 text-xs font-semibold text-teal">
                {getModule(slug)?.label ?? slug}
              </span>
            ))}
            {plan.includedModuleSlugs.length > 6 && (
              <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-xs font-semibold text-text-muted">
                +{plan.includedModuleSlugs.length - 6} more
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="mb-4 text-xs text-text-muted">
              No real payment gateway is wired up for this project (no Stripe/Razorpay keys exist). This is an
              honest demo — clicking below simulates a successful payment, nothing is actually charged.
            </p>
            <SubscribeForm planName={plan.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
