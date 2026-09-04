import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { MODULES, taxonomyToNavDot } from "@/lib/designer/modules";
import { MODULE_TIER_FEATURES } from "@/lib/designer/moduleTiers";

registerPage({
  id: "platform.modules.overview",
  moduleSlug: "platform",
  title: "Modules Overview",
  path: "/admin/modules",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Single Super-Admin overview of every module in the platform (MODULES, src/lib/designer/modules.ts) and its Basic/Pro/Ultimate feature breakdown (MODULE_TIER_FEATURES, src/lib/designer/moduleTiers.ts). Links out to /admin/partner-types (where a Partner Type's actual per-page tier assignment lives) and /help/modules (the same content, presented for partners). This page is the map — Access Keys and Partner Types are where the actual gates live.",
  sourceFile: "src/app/admin/(protected)/modules/page.tsx",
});

const TIER_LABEL = { basic: "Basic", pro: "Pro", ultimate: "Ultimate" } as const;
const TIER_VARIANT = { basic: "neutral", pro: "teal", ultimate: "amber" } as const;

export default function ModulesOverviewPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Modules Overview</h1>
          <p className="mt-1 max-w-[75ch] text-sm text-text-muted">
            Every module this platform offers, and its Basic/Pro/Ultimate feature breakdown. To actually gate a
            page behind a tier for a real Partner Type, set it in{" "}
            <Link href="/admin/partner-types" className="text-accent hover:underline">
              Partner Types
            </Link>
            . To grant/revoke a partner's per-module access, use{" "}
            <Link href="/admin/access-keys" className="text-accent hover:underline">
              Access Keys
            </Link>
            . The same content below is also shown to partners at{" "}
            <Link href="/help/modules" className="text-accent hover:underline">
              /help/modules
            </Link>
            .
          </p>
        </div>

        <div className="space-y-4 p-6">
          {MODULES.map((mod) => {
            const tiers = MODULE_TIER_FEATURES[mod.slug];
            return (
              <div key={mod.slug} className="rounded-md border border-border bg-bg-raised p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        taxonomyToNavDot(mod.taxonomy) === "teal"
                          ? "bg-teal"
                          : taxonomyToNavDot(mod.taxonomy) === "amber"
                          ? "bg-accent"
                          : "bg-text-muted"
                      }`}
                    />
                    <h2 className="font-display text-base font-bold text-text">{mod.label}</h2>
                    <StatusChip label={mod.taxonomy} variant="neutral" />
                  </div>
                  <Link href={`/help/modules/${mod.slug}`} className="text-xs text-accent hover:underline">
                    View guide &rarr;
                  </Link>
                </div>
                <p className="mt-1 text-sm text-text-muted">{mod.description}</p>

                {tiers ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["basic", "pro", "ultimate"] as const).map((tier) => (
                      <div key={tier} className="rounded-md border border-border bg-bg p-3">
                        <StatusChip label={TIER_LABEL[tier]} variant={TIER_VARIANT[tier]} />
                        <ul className="mt-2 space-y-1 text-xs text-text-muted">
                          {tiers[tier].map((f, i) => (
                            <li key={i}>&bull; {f}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-text-muted">No tier breakdown defined yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SuperAdminGate>
  );
}
