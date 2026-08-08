import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { PLANS } from "@/lib/sample-data/plans";
import { getModule } from "@/lib/designer/moduleRegistry";

registerPage({
  id: "platform.pricing",
  moduleSlug: "platform",
  title: "Pricing",
  path: "/pricing",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public pricing page — three plan cards (Basic/Pro/Ultimate) reading live from src/lib/sample-data/plans.ts, the same source /admin/plans edits, so pricing can never drift out of sync. Each card links to /signup?plan=<planId>.",
  sourceFile: "src/app/pricing/page.tsx",
});

export default async function PricingPage() {
  const allSlugs = Array.from(new Set(PLANS.flatMap((p) => p.includedModuleSlugs)));
  const moduleLabels = new Map(
    await Promise.all(allSlugs.map(async (slug) => [slug, (await getModule(slug))?.label ?? slug] as const))
  );
  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
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
        <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">Plans for every stage</h1>
        <p className="mbf-prose mx-auto mt-3 text-base text-text-muted">
          No-code stays no-code at every tier. What changes as you grow is how many modules and seats you get — not
          whether the builder works.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
        {PLANS.map((plan, i) => (
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
            </div>

            <Link href={`/subscribe/${plan.id}`} className="btn-accent mt-6 w-full text-center">
              Choose {plan.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
