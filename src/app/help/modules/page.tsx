import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { MODULES } from "@/lib/designer/modules";
import { MODULE_TIER_FEATURES } from "@/lib/designer/moduleTiers";

registerPage({
  id: "platform.guide.modules",
  moduleSlug: "platform",
  title: "Module Guide",
  path: "/help/modules",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The partner-facing guide to every module and what Basic/Pro/Ultimate unlocks for it — same content as the Super Admin's /admin/modules overview (MODULE_TIER_FEATURES, src/lib/designer/moduleTiers.ts), presented for a partner deciding what to enable or upgrade to.",
  sourceFile: "src/app/help/modules/page.tsx",
});

const TAXONOMY_LABEL: Record<string, string> = {
  vertical: "Business Module",
  "cross-cutting": "Cross-cutting Add-on",
  brand: "Brand / Multi-location",
};

export default function ModuleGuideIndexPage() {
  const groups: Record<string, typeof MODULES> = { vertical: [], "cross-cutting": [], brand: [] };
  for (const m of MODULES) groups[m.taxonomy].push(m);

  return (
    <div className="mbf-page min-h-screen bg-bg-sunken">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-text">Module Guide</h1>
        <p className="mt-2 max-w-[70ch] text-sm text-text-muted">
          Every module the platform offers, grouped by type. Each one has its own Basic / Pro / Ultimate
          breakdown — click through to see exactly what each tier unlocks.
        </p>
        <Link href="/help" className="mt-2 inline-block text-sm text-accent hover:underline">
          &larr; Back to Help
        </Link>

        {(["vertical", "brand", "cross-cutting"] as const).map((tax) =>
          groups[tax].length === 0 ? null : (
            <div key={tax} className="mt-8">
              <h2 className="font-display text-base font-bold text-text">{TAXONOMY_LABEL[tax]}</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {groups[tax].map((m) => {
                  const tiers = MODULE_TIER_FEATURES[m.slug];
                  return (
                    <Link
                      key={m.slug}
                      href={`/help/modules/${m.slug}`}
                      className="rounded-md border border-border bg-bg-raised p-4 hover:border-accent"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-sm font-bold text-text">{m.label}</h3>
                        {tiers && <StatusChip label="Basic · Pro · Ultimate" variant="neutral" />}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{m.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
