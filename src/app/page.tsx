import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { MODULES, type ModuleTaxonomy } from "@/lib/designer/modules";

registerPage({
  id: "platform.home",
  moduleSlug: "platform",
  title: "Home",
  path: "/",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public marketing home page (no AppShell). Hero, modular/no-code explanation, a module-category section pulling live from MODULES so it can't drift, and a screenshots section referencing /screenshots/*.png files that don't exist yet (graceful bg-bg-sunken fallback boxes) — real screenshots to be added in a follow-up pass. CTAs to /signup and /pricing.",
  sourceFile: "src/app/page.tsx",
});

const TAXONOMY_LABEL: Record<ModuleTaxonomy, string> = {
  brand: "Brand",
  vertical: "Verticals",
  "cross-cutting": "Cross-cutting",
};

const TAXONOMY_COPY: Record<ModuleTaxonomy, string> = {
  brand: "Multi-location and multi-partner hierarchy — Brand → Partners → Locations.",
  vertical: "Industry-specific modules — the core of what a business runs day to day.",
  "cross-cutting": "Plug into any vertical — inventory, payroll, compliance, loyalty.",
};

function groupedModules() {
  const groups: Record<ModuleTaxonomy, typeof MODULES> = { brand: [], vertical: [], "cross-cutting": [] };
  for (const m of MODULES) groups[m.taxonomy].push(m);
  return groups;
}

const SCREENSHOTS: { name: string; alt: string }[] = [
  { name: "dashboard", alt: "A vendor dashboard showing live stat tiles and recent activity" },
  { name: "pos-list", alt: "The POS module's list view showing recent sales in a data table" },
  { name: "designer", alt: "The Super Admin Designer listing every registered page in the product" },
];

export default function RootPage() {
  const groups = groupedModules();

  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-base font-extrabold text-text">My Biz Flow</span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/pricing" className="text-text-muted hover:text-text">
            Pricing
          </Link>
          <Link href="/help" className="text-text-muted hover:text-text">
            Help
          </Link>
          <Link href="/login" className="text-text-muted hover:text-text">
            Sign in
          </Link>
          <Link href="/signup" className="btn-accent">
            Get started
          </Link>
        </nav>
      </header>

      <section className="px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          One platform. Every business you run.
        </h1>
        <p className="mbf-prose mx-auto mt-5 text-lg leading-relaxed text-text-muted">
          My Biz Flow is a modular, no-code, multi-vertical business/CRM platform. Instead of shipping a separate
          product per industry, every business runs on one shared metadata engine — modules, fields, pipelines, and
          dashboards are all config-driven. Mix and match POS, Service Centre, Billing, Clinic, HRMS, and more on a
          single account.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup" className="btn-accent">
            Register your business
          </Link>
          <Link href="/pricing" className="btn-outline">
            See pricing
          </Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Built from one module registry</h2>
          <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
            No hardcoded business types — a Vendor&apos;s &quot;type&quot; is just the modules it enables.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {(Object.keys(groups) as ModuleTaxonomy[]).map((tax) => (
              <div key={tax} className="rounded-lg border border-border bg-bg-raised p-5">
                <h3 className="font-display text-base font-bold text-text">{TAXONOMY_LABEL[tax]}</h3>
                <p className="mt-1 text-sm text-text-muted">{TAXONOMY_COPY[tax]}</p>
                <ul className="mt-4 space-y-1.5">
                  {groups[tax].map((m) => (
                    <li key={m.slug} className="flex items-center gap-2 text-sm text-text">
                      <span
                        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                          tax === "vertical" ? "bg-teal" : tax === "brand" ? "bg-accent" : "bg-text-muted"
                        }`}
                      />
                      {m.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">See it in action</h2>
          <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
            Screenshots of the real running app — coming in a follow-up pass.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SCREENSHOTS.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-lg border border-border bg-bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/screenshots/${s.name}.png`}
                  alt={s.alt}
                  width={480}
                  height={300}
                  className="h-auto w-full bg-bg-sunken object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-text">Ready to set up your business?</h2>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/signup" className="btn-accent">
            Register your business
          </Link>
          <Link href="/pricing" className="btn-outline">
            See pricing
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        <Link href="/design-system" className="hover:text-text">
          Design system reference
        </Link>
      </footer>
    </div>
  );
}
