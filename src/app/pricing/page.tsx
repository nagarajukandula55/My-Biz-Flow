import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/LogoMark";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { listPublicPlans, type PlanRecord } from "@/lib/plansData";
import { getModule } from "@/lib/designer/moduleRegistry";
import { listActivePartnerTypes, type PartnerTypeRecord, type PlanTier } from "@/lib/designer/partnerTypesData";
import { MODULE_TIER_FEATURES } from "@/lib/designer/moduleTiers";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

// Reads live DB-backed module label overrides / partner type + plan data —
// must not be baked into a static build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "My Biz Flow plans for every stage — no-code stays no-code at every tier. Pick your business type to see the modules, tiers, and pricing bundled for it.",
  // Deliberately points at the base /pricing regardless of ?type= — the
  // type-scoped views are a filtered presentation of the same plan data,
  // not distinct content, so canonicalizing per-type would just create
  // duplicate-content signal for no benefit.
  alternates: { canonical: "/pricing" },
};

registerPage({
  id: "platform.pricing",
  moduleSlug: "platform",
  title: "Pricing",
  path: "/pricing",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public pricing page. With no ?type= param, shows a business-type chooser (same listActivePartnerTypes() source as /signup). With ?type=<id>, shows that PartnerType's bundled plans (planIds) filtered from the live Plan table, plus its planTierByPage-driven Basic/Pro/Ultimate feature breakdown pulled from moduleTiers.ts. Each plan card links to /subscribe/<planId>.",
  sourceFile: "src/app/pricing/page.tsx",
});

const TIER_LABEL: Record<PlanTier, string> = { basic: "Basic", pro: "Pro", ultimate: "Ultimate" };

/** Best-effort tier for a plan within a partner type: the highest tier any
 *  of the type's pages resolve to via planTierByPage, falling back to
 *  plan order (2nd of 3 = pro, last = ultimate, else basic) when a type
 *  hasn't set per-page tiers. */
function tierForPlanIndex(index: number, total: number): PlanTier {
  if (total <= 1) return "basic";
  if (index === total - 1) return "ultimate";
  if (index === 0) return "basic";
  return "pro";
}

function tierFeaturesForType(type: PartnerTypeRecord, tier: PlanTier): string[] {
  const modules = type.defaultModules.length > 0 ? type.defaultModules : [];
  const features: string[] = [];
  for (const slug of modules) {
    const tiers = MODULE_TIER_FEATURES[slug];
    if (!tiers) continue;
    features.push(...tiers[tier]);
  }
  return features;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const partnerTypes = await listActivePartnerTypes();
  const selectedType = searchParams.type
    ? partnerTypes.find((t) => t.id === searchParams.type)
    : undefined;

  const ALL_PLANS = await listPublicPlans();
  const PLANS: PlanRecord[] = selectedType
    ? ALL_PLANS.filter((p) => selectedType.planIds.includes(p.id))
    : ALL_PLANS;

  const allSlugs = Array.from(new Set(PLANS.flatMap((p) => p.includedModuleSlugs)));
  const moduleLabels = new Map(
    await Promise.all(allSlugs.map(async (slug) => [slug, (await getModule(slug))?.label ?? slug] as const))
  );

  // Product/Offer structured data straight from the same live Plan rows the
  // page renders below -- prices, billing cycle, and plan names here can
  // never drift out of sync with what's shown, so this stays accurate as an
  // AI-answer-engine (GEO) source for "what does My Biz Flow cost." When a
  // business type is selected, this narrows to exactly the plans shown for
  // it rather than staying generic.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: selectedType ? `${SITE_NAME} plans for ${selectedType.id}` : `${SITE_NAME} plans`,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      url: `${SITE_URL}/pricing${selectedType ? `?type=${encodeURIComponent(selectedType.id)}` : ""}`,
      price: plan.price,
      priceCurrency: "INR",
      description: `Up to ${plan.maxUsers} users, ${plan.maxLocations} location${plan.maxLocations === 1 ? "" : "s"}, billed ${plan.billingCycle}.`,
    })),
  };

  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-base font-extrabold text-text">My Biz Flow</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/login" className="text-text-muted hover:text-text">
            Sign in
          </Link>
          <Link href="/signup" className="btn-accent">
            Get started
          </Link>
        </nav>
      </header>

      <div className="px-6 py-16 text-center">
        {selectedType ? (
          <>
            <div className="mb-3 flex items-center justify-center gap-2 text-sm">
              <Link href="/pricing" className="font-semibold text-accent hover:underline">
                ← Change business type
              </Link>
            </div>
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
              Plans for {selectedType.id}
            </h1>
            <p className="mbf-prose mx-auto mt-3 text-base text-text-muted">
              {selectedType.description || "No-code stays no-code at every tier."} What changes as you grow is how
              many modules and seats you get — not whether the builder works.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">Plans for every stage</h1>
            <p className="mbf-prose mx-auto mt-3 text-base text-text-muted">
              No-code stays no-code at every tier. Pick the kind of business you run to see the modules, tiers, and
              pricing bundled for it.
            </p>
          </>
        )}
      </div>

      {!selectedType ? (
        partnerTypes.length === 0 ? (
          <p className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No business types are available yet — check back soon.
          </p>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
            {partnerTypes.map((t) => (
              <Link
                key={t.id}
                href={`/pricing?type=${encodeURIComponent(t.id)}`}
                className="flex flex-col rounded-lg border border-border bg-bg-raised p-5 transition hover:border-accent"
              >
                <h2 className="font-display text-base font-bold text-text">{t.id}</h2>
                <p className="mt-1 flex-1 text-sm text-text-muted">{t.description || "—"}</p>
                <span className="mt-4 font-semibold text-accent">See plans →</span>
              </Link>
            ))}
          </div>
        )
      ) : PLANS.length === 0 ? (
        <p className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          No plans are published yet for this business type — check back soon.
        </p>
      ) : (
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
        {PLANS.map((plan, i) => {
          const tier = tierForPlanIndex(i, PLANS.length);
          const tierFeatures = tierFeaturesForType(selectedType, tier);
          return (
          <div
            key={plan.id}
            className={`flex flex-col rounded-lg border p-6 ${
              i === 1 ? "border-accent bg-bg-raised shadow-lg" : "border-border bg-bg-raised"
            }`}
          >
            {i === 1 && (
              <StatusChip label="Most popular" variant="amber" className="mb-3 w-fit" />
            )}
            <h2 className="font-display text-xl font-bold text-text">{plan.name}</h2>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {TIER_LABEL[tier]} tier
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold tabular-nums text-text">
                ₹{plan.price.toLocaleString("en-IN")}
              </span>
              <span className="text-sm text-text-muted">/ {plan.billingCycle}</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              Up to {plan.maxUsers} users · {plan.maxLocations} location{plan.maxLocations === 1 ? "" : "s"}
            </p>

            <div className="mt-5 flex-1">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Modules included
              </div>
              <ul className="space-y-1.5">
                {plan.includedModuleSlugs.map((slug) => (
                  <li key={slug} className="flex items-center gap-2 text-sm text-text">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                    {moduleLabels.get(slug) ?? slug}
                  </li>
                ))}
              </ul>
              {tierFeatures.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    What you get at {TIER_LABEL[tier]}
                  </div>
                  <ul className="space-y-1.5">
                    {tierFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-text">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <Link href={`/subscribe/${plan.id}`} className="btn-accent mt-6 w-full text-center">
              Choose {plan.name}
            </Link>
          </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
