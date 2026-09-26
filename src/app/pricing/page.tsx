import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { listPublicPlans, type PlanRecord } from "@/lib/plansData";
import { getModule } from "@/lib/designer/moduleRegistry";
import { listActivePartnerTypes, type PartnerTypeRecord, type PlanTier } from "@/lib/designer/partnerTypesData";
// TIER_LABEL/tierForPlanIndex used to be defined inline here. They now live
// in pageTiers.ts alongside DEFAULT_PAGE_TIERS, so the tier this page
// ADVERTISES for a plan and the tier the runtime gate ENFORCES for that
// same plan are computed by one function, not two copies that can drift.
import { TIER_LABEL, tierForPlanIndex } from "@/lib/designer/pageTiers";
import { MODULE_TIER_FEATURES } from "@/lib/designer/moduleTiers";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
// Real Yearly/2-Year totals (35%/55% off, AN-CRM's actual live discounts --
// see subscriptionData.ts) computed from each plan's monthly rate, so a
// visitor sees the real amount they'd pay up front instead of only a
// monthly base rate with billing-cycle math left implicit.
import { BILLING_CYCLES, CYCLE_DISCOUNT_PCT, computeCyclePrice, currentMonthlyRate, isLaunchPricingActive, cycleLabel } from "@/lib/subscriptionData";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { tPublic } from "@/lib/i18n/publicLocales";

// Reads live DB-backed module label overrides / partner type + plan data —
// must not be permanently baked into a static build. Plans/labels only
// change via Super Admin action, not per-request, so ISR (revalidate) is
// enough to stay fresh without hitting Postgres on every visit.
export const revalidate = 60;

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

/**
 * Short, outcome-focused per-business-type copy for the generic "What you
 * get" section below — grounded in what each type's bundled modules
 * actually do (see modules.ts descriptions / MODULE_TIER_FEATURES), never
 * an unbuilt feature. Only the types with real, distinctive copy worth
 * hand-writing get an entry here; any PartnerType id not listed (including
 * ones seeded later) falls back to BUSINESS_TYPE_FALLBACK below, built from
 * the type's own stored `description` plus its module list, so no business
 * type ever renders a bare "manages my-biz-flow.com/{slug} things"
 * placeholder.
 */
const BUSINESS_TYPE_COPY: Record<string, { heading: string; intro: string }> = {
  "service-centre": {
    heading: "Everything a repair shop actually needs, in one screen",
    intro:
      "Service Centre isn't a generic ticketing tool bent into shape — this is what it actually does, ready the moment you sign up below.",
  },
  pos: {
    heading: "Ring up sales without losing track of stock",
    intro:
      "A till built for a single-store checkout counter — cart, tender capture, and receipts on Basic, with real-time stock deduction and split-tender payments as you grow into Pro.",
  },
  telecalling: {
    heading: "Turn a contact list into a working call floor",
    intro:
      "Upload a contact list once, hand it to agents who click-to-call straight from the app, and trigger SMS/WhatsApp templates per contact — no separate dialer or spreadsheet hand-offs.",
  },
  "field-force": {
    heading: "Run a home-services booking desk end to end",
    intro:
      "A priced service catalog, customer bookings, dispatch of engineers by service and pincode, payment collection, and ratings — the whole loop from a customer's booking to a rated, paid job.",
  },
  manufacturing: {
    heading: "Track a job from raw material to finished stock",
    intro:
      "Bills of materials, production work orders, and raw-material consumption tracking so a production run's real cost and stage aren't guesswork kept on a whiteboard.",
  },
  "wholesale-b2b": {
    heading: "Give every dealer their own price list and terms",
    intro:
      "Bulk pricing tiers, dealer/distributor accounts, and credit terms — so a repeat B2B buyer gets the rate and credit line you've agreed with them, not a walk-in retail price.",
  },
  "event-booking": {
    heading: "Keep every booking, vendor, and date straight",
    intro:
      "Event and venue scheduling with catering and resource coordination in one calendar, so double-booking a hall or forgetting a vendor stops being a manual cross-check.",
  },
  legal: {
    heading: "Keep every matter, hour, and document in one file",
    intro:
      "Client matter records, billable hours, and document tracking — so a case's paper trail and the hours billed against it live in one place instead of a folder plus a separate timesheet.",
  },
  education: {
    heading: "Run enrollment, batches, and fees without the spreadsheet juggle",
    intro:
      "Student enrollment, batch/course scheduling, fee collection, and attendance in one place — so a coaching centre or school stops reconciling three separate registers.",
  },
  clinic: {
    heading: "Track every patient, appointment, and prescription in one place",
    intro:
      "Patient records, appointment scheduling, and consultation billing together — no more juggling a paper register, a separate billing book, and a phone for appointment calls.",
  },
  "amc-field-service": {
    heading: "Never miss a contract renewal or a scheduled visit",
    intro:
      "Recurring annual maintenance contracts, technician dispatch, and service-visit logging — so a contract's renewal date and its visit history are tracked, not remembered.",
  },
  "restaurant-pos": {
    heading: "Run the floor and the kitchen off the same order",
    intro:
      "Table and KOT management with per-table order carts and split-bill settlement, so a server's order and the kitchen's ticket are always the same record, not two.",
  },
  "salon-spa": {
    heading: "Book appointments without double-booking a stylist",
    intro:
      "A service menu, stylist assignment, and appointment scheduling built for walk-in and booked slots together, so two customers never land on the same chair at the same time.",
  },
};

/** Built from the type's own DB-stored description and module set — the
 * fallback for any PartnerType id without a hand-written entry above. */
function fallbackCopyForType(type: PartnerTypeRecord): { heading: string; intro: string } {
  return {
    heading: `Everything ${type.id.replace(/-/g, " ")} needs, bundled in one account`,
    intro:
      type.description ||
      "The modules bundled for this business type, ready the moment you sign up below.",
  };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const locale = getLocaleFromCookie();
  const tp = (key: Parameters<typeof tPublic>[1], vars?: Record<string, string | number>) => tPublic(locale, key, vars);
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

  // Feature cards for the generic "What you get" section below — resolved
  // from the selected type's own defaultModules against the canonical
  // MODULES registry, so the copy always matches what the type actually
  // bundles. Vertical modules (the type's "core" business) are shown ahead
  // of cross-cutting add-ons (Inventory, HRMS, etc.) when there are more
  // than 4, since the vertical modules are what makes this business type
  // distinct.
  const typeModuleDefs = selectedType
    ? (
        await Promise.all(
          selectedType.defaultModules.map((slug) => getModule(slug))
        )
      ).filter((m): m is NonNullable<typeof m> => Boolean(m))
    : [];
  const sortedTypeModuleDefs = [...typeModuleDefs].sort((a, b) => {
    const rank = (t: string) => (t === "vertical" ? 0 : t === "brand" ? 1 : 2);
    return rank(a.taxonomy) - rank(b.taxonomy);
  });
  const whatYouGetModules = sortedTypeModuleDefs.slice(0, 4);
  const typeCopy = selectedType
    ? BUSINESS_TYPE_COPY[selectedType.id] ?? fallbackCopyForType(selectedType)
    : undefined;

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
    // Real per-type intro copy (same BUSINESS_TYPE_COPY/fallback used in the
    // "What you get" section below) instead of a generic line, so an
    // AI-answer-engine reading this structured data gets the same
    // outcome-focused explanation a visitor sees on the page.
    description: typeCopy?.intro,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      url: `${SITE_URL}/pricing${selectedType ? `?type=${encodeURIComponent(selectedType.id)}` : ""}`,
      price: currentMonthlyRate(plan),
      priceCurrency: "INR",
      description: `Up to ${plan.maxUsers} users, ${plan.maxLocations} location${plan.maxLocations === 1 ? "" : "s"}, ${plan.includedModuleSlugs.length} module${plan.includedModuleSlugs.length === 1 ? "" : "s"} included, billed ${plan.billingCycle}.`,
    })),
  };

  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader ctaClassName="mbf-cta-glow" locale={locale} />

      <div className="px-6 py-16 text-center">
        {selectedType ? (
          <>
            <div className="mb-3 flex items-center justify-center gap-2 text-sm">
              <Link href="/pricing" className="font-semibold text-accent hover:underline">
                {tp("changeBusinessType")}
              </Link>
            </div>
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
              {tp("plansTitleForType", { type: selectedType.id }).split(selectedType.id)[0]}
              <span className="mbf-headline-mark">{selectedType.id}</span>
            </h1>
            <p className="mbf-prose mx-auto mt-3 text-base text-text-muted">
              {selectedType.description || tp("noCodeStaysNoCode")} {tp("growsCopy")}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
              {tp("plansTitleGeneric")}
            </h1>
            <p className="mbf-prose mx-auto mt-3 text-base text-text-muted">
              {tp("plansIntroGeneric")}
            </p>
          </>
        )}
      </div>

      {selectedType && typeCopy && whatYouGetModules.length > 0 && (
        <section className="border-t border-border bg-bg-raised px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-accent">{tp("whatYouGetLabel")}</p>
            <h2 className="mt-2 text-center font-display text-2xl font-bold text-text">{typeCopy.heading}</h2>
            <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">{typeCopy.intro}</p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {whatYouGetModules.map((m) => (
                <div key={m.slug} className="mbf-glass-card p-5">
                  <h3 className="font-display text-base font-bold text-text">{m.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{m.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm font-semibold text-text-muted">{tp("pickPlanBelow")}</p>
          </div>
        </section>
      )}

      {!selectedType ? (
        partnerTypes.length === 0 ? (
          <p className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            {tp("noBusinessTypesYet")}
          </p>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
            {partnerTypes.map((t) => (
              <Link
                key={t.id}
                href={`/pricing?type=${encodeURIComponent(t.id)}`}
                className="mbf-glass-card flex flex-col p-5"
              >
                <h2 className="font-display text-base font-bold text-text">{t.id}</h2>
                <p className="mt-1 flex-1 text-sm text-text-muted">{t.description || "—"}</p>
                <span className="mt-4 font-semibold text-accent">{tp("seePlans")}</span>
              </Link>
            ))}
          </div>
        )
      ) : PLANS.length === 0 ? (
        <p className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          {tp("noPlansPublished")}
        </p>
      ) : (
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
        {PLANS.map((plan, i) => {
          const tier = tierForPlanIndex(i, PLANS.length);
          const tierFeatures = tierFeaturesForType(selectedType, tier);
          return (
          <div
            key={plan.id}
            className={`mbf-glass-card flex flex-col p-6 ${i === 1 ? "mbf-cta-glow border-accent/50" : ""}`}
          >
            {i === 1 && (
              <StatusChip label={tp("mostPopular")} variant="amber" className="mb-3 w-fit" />
            )}
            <h2 className="font-display text-xl font-bold text-text">{plan.name}</h2>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {TIER_LABEL[tier]} {tp("tierSuffix")}
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold tabular-nums text-text">
                ₹{currentMonthlyRate(plan).toLocaleString("en-IN")}
              </span>
              <span className="text-sm text-text-muted">{tp("perMonth")}</span>
              {isLaunchPricingActive() && plan.launchPrice != null && (
                <span className="ml-1 font-mono text-sm text-text-muted line-through">
                  ₹{plan.price.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {isLaunchPricingActive() && plan.launchPrice != null && (
              <p className="mt-0.5 text-xs font-semibold text-success">{tp("launchPricing")}</p>
            )}
            <p className="mt-2 text-sm text-text-muted">
              {tp("upToUsersLocations", { users: plan.maxUsers, locations: plan.maxLocations })}
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-text-muted">
              {BILLING_CYCLES.map((c) => (
                <div key={c}>
                  {cycleLabel(c)}: <span className="font-semibold text-text">₹{computeCyclePrice(currentMonthlyRate(plan), c).toLocaleString("en-IN")}</span> total ({CYCLE_DISCOUNT_PCT[c]}% off)
                </div>
              ))}
            </div>

            <div className="mt-5 flex-1">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {tp("modulesIncluded", { count: plan.includedModuleSlugs.length })}
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
                    {tp("whatYouGetAtTier", { tier: TIER_LABEL[tier] })}
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
              {tp("choosePlanPrefix", { plan: plan.name })}
            </Link>
          </div>
          );
        })}
      </div>
      )}

      {selectedType && PLANS.length > 0 && (
        <div className="mx-auto max-w-3xl px-6 pb-20">
          <h2 className="font-display text-2xl font-bold text-text">{tp("pricingFaqTitle")}</h2>
          <dl className="mt-6 space-y-6">
            {PRICING_FAQ_KEYS.map(([qKey, aKey]) => (
              <div key={qKey}>
                <dt className="text-sm font-semibold text-text">{tp(qKey)}</dt>
                <dd className="mt-1 text-sm text-text-muted">{tp(aKey)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Kept modest and specific to what this app actually does — no invented
 * free-trial, refund, or promo-code claims (My Biz Flow has no trial or
 * refund-policy page and no referral system yet, unlike AN-CRM's own
 * pricing FAQ which references its 15-day trial and Cancellation Policy;
 * see this task's report for what was deliberately left out and why).
 */
// Translated via tPublic() above — key pairs kept here so the English
// source strings live in one place (src/lib/i18n/dict-public/en.ts).
const PRICING_FAQ_KEYS = [
  ["pricingFaq1Q", "pricingFaq1A"],
  ["pricingFaq2Q", "pricingFaq2A"],
  ["pricingFaq3Q", "pricingFaq3A"],
  ["pricingFaq4Q", "pricingFaq4A"],
] as const;
