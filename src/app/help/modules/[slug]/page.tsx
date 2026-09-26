import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { getModule, MODULES } from "@/lib/designer/modules";
import { MODULE_TIER_FEATURES } from "@/lib/designer/moduleTiers";
import { MODULE_TIER_INTRO, GENERIC_TIER_INTRO } from "@/lib/designer/moduleTierIntro";
import { listActivePartnerTypes } from "@/lib/designer/partnerTypesData";

// Reads live DB-backed PartnerType rows for the "See pricing" link below —
// same live-data caveat as pricing/page.tsx: must not be baked into a
// static build, and Super-Admin changes to partner types should show up
// within a short window rather than only at next deploy.
export const revalidate = 60;

registerPage({
  id: "platform.guide.module-detail",
  moduleSlug: "platform",
  title: "Module Guide — Detail",
  path: "/help/modules/[slug]",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "One module's full Basic/Pro/Ultimate breakdown, partner-facing — reads MODULE_TIER_FEATURES (src/lib/designer/moduleTiers.ts) for the given module slug.",
  sourceFile: "src/app/help/modules/[slug]/page.tsx",
});

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const mod = getModule(params.slug);
  if (!mod) return {};
  return {
    title: `${mod.label} Module Guide`,
    description: mod.description,
    alternates: { canonical: `/help/modules/${mod.slug}` },
  };
}

const TIER_LABEL = { basic: "Basic", pro: "Pro", ultimate: "Ultimate" } as const;
const TIER_VARIANT = { basic: "neutral", pro: "teal", ultimate: "amber" } as const;

export default async function ModuleGuideDetailPage({ params }: { params: { slug: string } }) {
  const mod = getModule(params.slug);
  if (!mod) notFound();
  const tiers = MODULE_TIER_FEATURES[params.slug];
  const tierIntro = MODULE_TIER_INTRO[params.slug] ?? GENERIC_TIER_INTRO;

  // Only offer a "See pricing" link when this module is actually a live,
  // active PartnerType a visitor can sign up under today — not every
  // module slug has a corresponding PartnerType, and a dead/inactive one
  // shouldn't be linked from here (same live-data check pricing/page.tsx
  // and the homepage's module showcase already use).
  const partnerTypes = await listActivePartnerTypes();
  const livePartnerType = partnerTypes.find((t) => t.id === params.slug);

  return (
    <div className="mbf-page min-h-screen bg-bg-sunken">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-2.5">
          <BrandLogo height={34} />
        </div>
        <Link href="/help/modules" className="mt-6 inline-block text-sm text-accent hover:underline">
          &larr; Back to Module Guide
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-text">{mod.label}</h1>
        <p className="mt-2 max-w-[65ch] text-sm text-text-muted">{mod.description}</p>

        {!tiers ? (
          <p className="mt-8 text-sm text-text-muted">No tier breakdown documented yet for this module.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["basic", "pro", "ultimate"] as const).map((tier) => (
              <div key={tier} className="rounded-md border border-border bg-bg-raised p-4">
                <StatusChip label={TIER_LABEL[tier]} variant={TIER_VARIANT[tier]} />
                <p className="mt-2 text-xs text-text-muted">{tierIntro[tier]}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-text">
                  {tiers[tier].map((f, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-accent">&bull;</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {livePartnerType ? (
          <p className="mt-8 text-sm">
            <Link href={`/pricing?type=${encodeURIComponent(livePartnerType.id)}`} className="text-accent hover:underline">
              See live pricing for {livePartnerType.id} &rarr;
            </Link>
          </p>
        ) : (
          <p className="mt-8 text-xs text-text-muted">
            Pricing for each tier isn&apos;t finalized yet — talk to your account contact about what&apos;s
            available today.
          </p>
        )}
      </div>
    </div>
  );
}
