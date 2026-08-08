import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { listActiveVendorTypes } from "@/lib/designer/vendorTypesData";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.home",
  moduleSlug: "platform",
  title: "Home",
  path: "/",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public marketing home page (no AppShell). Hero, a 'choose your business type' section pulling live Active Vendor Types from the VendorType Prisma table (each card links to /signup?type=<id>, so the home page can never drift from what Super Admin has actually configured), and a screenshots section referencing /screenshots/*.png files that don't exist yet (graceful bg-bg-sunken fallback boxes) — real screenshots to be added in a follow-up pass. CTAs to /signup and /pricing.",
  sourceFile: "src/app/page.tsx",
});

const SCREENSHOTS: { name: string; alt: string }[] = [
  { name: "dashboard", alt: "A vendor dashboard showing live stat tiles and recent activity" },
  { name: "pos-list", alt: "The POS module's list view showing recent sales in a data table" },
  { name: "designer", alt: "The Super Admin Designer listing every registered page in the product" },
];

export default async function RootPage() {
  const vendorTypes = await listActiveVendorTypes();

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
          <h2 className="text-center font-display text-2xl font-bold text-text">Choose your business type</h2>
          <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
            Pick the type that matches how you run your business — everything else (modules, pricing tiers)
            is configured for you.
          </p>
          {vendorTypes.length === 0 ? (
            <p className="mx-auto mt-10 max-w-md rounded-lg border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
              No business types are available for signup yet — check back soon.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {vendorTypes.map((t) => (
                <div key={t.id} className="flex flex-col rounded-lg border border-border bg-bg-raised p-5">
                  <h3 className="font-display text-base font-bold text-text">{t.id}</h3>
                  <p className="mt-1 flex-1 text-sm text-text-muted">{t.description || "—"}</p>
                  <Link href={`/signup?type=${encodeURIComponent(t.id)}`} className="btn-accent mt-4 text-center">
                    Sign up as {t.id}
                  </Link>
                </div>
              ))}
            </div>
          )}
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

      <footer className="flex flex-col items-center gap-3 border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <Link href="/pricing" className="hover:text-text">
            Pricing
          </Link>
          <Link href="/help" className="hover:text-text">
            Help
          </Link>
          <Link href="/contact" className="hover:text-text">
            Contact
          </Link>
          <Link href="/terms" className="hover:text-text">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
          <Link href="/design-system" className="hover:text-text">
            Design system reference
          </Link>
        </nav>
      </footer>
    </div>
  );
}
