import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

registerPage({
  id: "platform.solutions.field-force",
  moduleSlug: "platform",
  title: "Solutions — Field Force",
  path: "/solutions/field-force",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Full marketing/feature page for the Field Force business type — a real, signup-able Partner Type (PartnerType.id 'field-force', idPrefix 'FF', real Plan pricing). Real, verified capabilities only: priced service catalog, customer bookings, skilled/unskilled provider onboarding (Provider.skillLevel), dispatch by service+pincode, payment collection, ratings.",
  sourceFile: "src/app/solutions/field-force/page.tsx",
});

export const metadata: Metadata = {
  title: "Field Force / Home Services Booking Software | My Biz Flow",
  description:
    "Run a home-services business end to end: a priced service catalog, customer bookings, dispatch of skilled or unskilled engineers by service and pincode, payment collection, and ratings — with providers onboarding themselves or through your team.",
  alternates: { canonical: "/solutions/field-force" },
};

const PERKS = [
  {
    title: "Priced service catalog",
    description: "List every service you dispatch for with its own price — customers book against real, published rates, not a phone-call quote.",
  },
  {
    title: "Skilled & unskilled provider onboarding",
    description: "Every provider carries a real skill level, so a job requiring a skilled technician never gets routed to someone who isn't qualified for it.",
  },
  {
    title: "Providers onboard themselves",
    description: "Self-signup, admin-onboarding, or team-lead onboarding — three real paths to bring a provider on, not just one admin-only form.",
  },
  {
    title: "Dispatch by service & pincode",
    description: "A booking matches to a provider who actually offers that service in that area — not a random assignment.",
  },
  {
    title: "Customers book without an account",
    description: "A public customer booking flow with its own lightweight login — no forcing a customer through your staff's account system.",
  },
  {
    title: "Payment collection per booking",
    description: "Track what's owed and collected on every job, tied to the booking it belongs to.",
  },
  {
    title: "Ratings & booking history",
    description: "Every completed job leaves a rating, building a real track record per provider over time.",
  },
  {
    title: "No-code, same as every module",
    description: "A Super Admin manages the service catalog, fields, and provider roster without custom development.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Build your service catalog", description: "List what you dispatch for and at what price." },
  { step: "2", title: "Onboard providers", description: "Bring on skilled and unskilled engineers — self-signup, admin-onboarded, or via a team lead — each tagged with their real skill level." },
  { step: "3", title: "Customers book", description: "A customer picks a service and books, no account required beyond a lightweight customer login." },
  { step: "4", title: "Dispatch, collect, rate", description: "The right provider gets matched by service and pincode, payment is tracked per booking, and the job closes with a rating." },
];

const FAQS = [
  { q: "Can I tell skilled and unskilled providers apart?", a: "Yes — every provider carries a real skill level, and services can require a minimum skill level, so dispatch respects it." },
  { q: "How do providers get onboarded?", a: "Three ways: they sign up themselves, your admin onboards them directly, or a team lead onboards providers under them." },
  { q: "Do customers need an account to book?", a: "They need a lightweight customer login (separate from your staff accounts), not a full business signup." },
  { q: "Is payment tracked per job?", a: "Yes — payment collection is tied to each booking, not a separate ledger you have to reconcile by hand." },
];

export default function FieldForceSolutionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Field Force / Home Services Booking Software",
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      areaServed: "IN",
      description: metadata.description,
      url: `${SITE_URL}/solutions/field-force`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Field Force", item: `${SITE_URL}/solutions/field-force` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo height={36} />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/solutions/service-centre" className="text-text-muted hover:text-text">Service Centre</Link>
          <Link href="/solutions/telecalling" className="text-text-muted hover:text-text">Telecalling</Link>
          <Link href="/pricing" className="text-text-muted hover:text-text">Pricing</Link>
          <Link href="/login" className="text-text-muted hover:text-text">Sign in</Link>
          <Link href="/signup?type=field-force" className="btn-accent mbf-cta-glow">Get started</Link>
        </nav>
      </header>

      <section className="px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Field Force</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          Book, dispatch, and pay <span className="mbf-headline-mark">home-service jobs</span>.
        </h1>
        <p className="mbf-prose mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          A priced service catalog, customer bookings, and dispatch of skilled or unskilled engineers by service and
          pincode — its own business type, with its own pricing.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup?type=field-force" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing?type=field-force" className="btn-outline">See pricing</Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Everything a home-services business needs</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p) => (
              <div key={p.title} className="mbf-glass-card p-5">
                <h3 className="font-display text-base font-bold text-text">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-text">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Questions</h2>
          <div className="mt-8 flex flex-col gap-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-display text-base font-bold text-text">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-text">Ready to put your provider network to work?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup?type=field-force" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing?type=field-force" className="btn-outline">See pricing</Link>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <Link href="/" className="hover:text-text">Home</Link>
          <Link href="/solutions/service-centre" className="hover:text-text">Service Centre</Link>
          <Link href="/solutions/telecalling" className="hover:text-text">Telecalling</Link>
          <Link href="/pricing" className="hover:text-text">Pricing</Link>
          <Link href="/contact" className="hover:text-text">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
