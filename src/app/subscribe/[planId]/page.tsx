import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { getPlan } from "@/lib/plansData";
import { getModule } from "@/lib/designer/moduleRegistry";
import { SubscribeForm } from "./SubscribeForm";

registerPage({
  id: "platform.subscribe",
  moduleSlug: "platform",
  title: "Subscribe — Account and Payment",
  path: "/subscribe/[planId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public plan selection creates the business account first, carries the selected plan into the partner subscription, and then uses the existing verified Razorpay checkout.",
  sourceFile: "src/app/subscribe/[planId]/page.tsx",
});

export default async function SubscribePage({ params, searchParams }: { params: { planId: string }; searchParams: { type?: string } }) {
  const plan = await getPlan(params.planId);

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

  const shownSlugs = plan.includedModuleSlugs.slice(0, 6);
  const moduleLabels = new Map(
    await Promise.all(shownSlugs.map(async (slug) => [slug, (await getModule(slug))?.label ?? slug] as const))
  );

  return (
    <div className="mbf-page flex min-h-screen w-full justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <BrandLogo height={32} />
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
            {shownSlugs.map((slug) => (
              <span key={slug} className="rounded-full bg-teal-soft px-2 py-0.5 text-xs font-semibold text-teal">
                {moduleLabels.get(slug) ?? slug}
              </span>
            ))}
            {plan.includedModuleSlugs.length > 6 && (
              <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-xs font-semibold text-text-muted">
                +{plan.includedModuleSlugs.length - 6} more
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="mb-4 text-xs text-text-muted">Create the account first, then complete payment securely from the partner subscription page.</p>
            <SubscribeForm planName={plan.name} planId={plan.id} partnerTypeId={searchParams.type} />
          </div>
        </div>
      </div>
    </div>
  );
}
