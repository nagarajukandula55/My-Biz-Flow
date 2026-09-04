import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { getModule, MODULES } from "@/lib/designer/modules";
import { MODULE_TIER_FEATURES } from "@/lib/designer/moduleTiers";

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

const TIER_LABEL = { basic: "Basic", pro: "Pro", ultimate: "Ultimate" } as const;
const TIER_VARIANT = { basic: "neutral", pro: "teal", ultimate: "amber" } as const;
const TIER_BLURB = {
  basic: "Everything needed to start running this part of the business day to day.",
  pro: "Adds the accountability, assignment, and workflow controls a growing team needs.",
  ultimate: "Adds full financial/compliance integration and cross-module reach.",
} as const;

export default function ModuleGuideDetailPage({ params }: { params: { slug: string } }) {
  const mod = getModule(params.slug);
  if (!mod) notFound();
  const tiers = MODULE_TIER_FEATURES[params.slug];

  return (
    <div className="mbf-page min-h-screen bg-bg-sunken">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
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
                <p className="mt-2 text-xs text-text-muted">{TIER_BLURB[tier]}</p>
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

        <p className="mt-8 text-xs text-text-muted">
          Pricing for each tier isn&apos;t finalized yet — talk to your account contact about what&apos;s
          available today.
        </p>
      </div>
    </div>
  );
}
