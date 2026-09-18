import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

registerPage({
  id: "platform.downloads",
  moduleSlug: "platform",
  title: "Downloads",
  path: "/downloads",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public page explaining how to install each app (Service Centre, Telecalling, Field Force) as a real installable PWA — 'Add to Home Screen' from each module's own login/entry page, backed by a real per-partner manifest.webmanifest (Service Centre, Telecalling) or the site-wide field-force-manifest.json (Field Force). Deliberately does not claim a universal one-click install link: every app here is scoped to the signed-in partner/agent/provider/customer, not a store listing, so the actual install happens from within each account's own login page, which this page links to generically (there is no single URL that works for every partner).",
  sourceFile: "src/app/downloads/page.tsx",
});

export const metadata: Metadata = {
  title: "Download the App | My Biz Flow",
  description:
    "Install the Service Centre, Telecalling, or Field Force app on your phone or desktop — no app store required. Add to Home Screen from your account for a real, offline-capable app icon.",
  alternates: { canonical: "/downloads" },
};

const APPS = [
  {
    slug: "service-centre",
    name: "Service Centre",
    tagline: "For repair shop staff — workorders, inquiries, billing.",
    installFrom: "Sign in to your Service Centre account, then use your browser's \"Add to Home Screen\" / \"Install app\" option.",
    cta: { label: "Sign in", href: "/login" },
    learnMore: "/solutions/service-centre",
  },
  {
    slug: "telecalling",
    name: "Telecalling",
    tagline: "For telecaller agents — call queue, click-to-call, templates.",
    installFrom: "Your business gives you a personal Agent ID login link. Open it, sign in, then \"Add to Home Screen\" from your browser.",
    cta: { label: "Learn more", href: "/solutions/telecalling" },
    learnMore: "/solutions/telecalling",
  },
  {
    slug: "field-force",
    name: "Field Force",
    tagline: "For providers and customers — bookings, dispatch, job tracking.",
    installFrom: "Free to join. Sign up as a provider or request a service, then use \"Add to Home Screen\" from your browser.",
    cta: { label: "Join as a Provider", href: "/partner/FF0001/field-force/provider/signup" },
    learnMore: "/solutions/field-force",
  },
];

export default function DownloadsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Downloads", item: `${SITE_URL}/downloads` },
    ],
  };

  return (
    <div className="min-h-screen bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo height={36} />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/pricing" className="text-text-muted hover:text-text">Pricing</Link>
          <Link href="/login" className="text-text-muted hover:text-text">Sign in</Link>
          <Link href="/signup" className="btn-accent mbf-cta-glow">Get started</Link>
        </nav>
      </header>

      <section className="px-6 py-16 text-center">
        <h1 className="mx-auto max-w-2xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          Get the app
        </h1>
        <p className="mbf-prose mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          {SITE_NAME}'s apps install straight from your browser — no app store, no separate download. Sign in, then
          use "Add to Home Screen," and you get a real app icon that opens full-screen, works offline for what's
          already loaded, and feels like a native app.
        </p>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {APPS.map((app) => (
            <div key={app.slug} className="mbf-glass-card flex flex-col p-6">
              <h2 className="font-display text-lg font-bold text-text">{app.name}</h2>
              <p className="mt-1 text-sm text-text-muted">{app.tagline}</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-text">{app.installFrom}</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href={app.cta.href} className="btn-accent mbf-cta-glow text-center">
                  {app.cta.label}
                </Link>
                {app.learnMore !== app.cta.href && (
                  <Link href={app.learnMore} className="btn-outline text-center">
                    Learn more
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">How "Add to Home Screen" works</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-display text-base font-bold text-text">On a phone (Android/iOS)</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                Open the app's login page in your browser, tap the browser menu, and choose "Add to Home Screen" (or
                "Install app," depending on your browser). It'll appear as a normal app icon.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text">On desktop (Chrome/Edge)</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                Look for an install icon in the address bar, or open the browser menu and choose "Install [app
                name]." It opens in its own window, separate from your regular browser tabs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <Link href="/" className="hover:text-text">Home</Link>
          <Link href="/solutions/service-centre" className="hover:text-text">Service Centre</Link>
          <Link href="/solutions/telecalling" className="hover:text-text">Telecalling</Link>
          <Link href="/solutions/field-force" className="hover:text-text">Field Force</Link>
          <Link href="/pricing" className="hover:text-text">Pricing</Link>
          <Link href="/contact" className="hover:text-text">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
