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
    "Full marketing/feature page for Field Force — a free-to-join home-services marketplace (PartnerType.id 'field-force', idPrefix 'FF', Plan price 0). Not a per-partner SaaS subscription: the platform earns a small commission per completed booking instead (src/lib/fieldForce/commission.ts, configured platform-wide at Admin > Field Force Platform Commission), which is why there is no signup fee. Real, verified capabilities only: priced service catalog, customer bookings, skilled/unskilled provider onboarding (Provider.skillLevel), dispatch by service+pincode, payment collection, ratings.",
  sourceFile: "src/app/solutions/field-force/page.tsx",
});

// The one canonical Field Force operator account (FF0001) — see
// scripts/createFieldForceOperator.ts. Providers/customers sign up
// directly under this account, not a business they register themselves.
const FF_OPERATOR_ID = "FF0001";
const PROVIDER_SIGNUP_HREF = `/partner/${FF_OPERATOR_ID}/field-force/provider/signup`;
const CUSTOMER_SIGNUP_HREF = `/partner/${FF_OPERATOR_ID}/field-force/customer/signup`;

export const metadata: Metadata = {
  title: "Field Force — Join as a Provider or Book a Service",
  description:
    "Free to join. Skilled or unskilled professionals sign up as a service provider and get their own login to receive and manage jobs. Customers request home services — repairs, installs, and more — and get matched to a provider by service and pincode.",
  alternates: { canonical: "/solutions/field-force" },
};

const PERKS = [
  {
    title: "Free to join",
    description: "No subscription, no signup fee — the platform earns a small commission only when a job is actually completed and paid for.",
  },
  {
    title: "Skilled & unskilled work, both welcome",
    description: "Every provider carries a real skill level, so a job requiring a skilled technician never gets routed to someone who isn't qualified for it.",
  },
  {
    title: "Your own login",
    description: "Sign up and get your own provider account — no separate app store listing to hunt for, no waiting on someone else's account.",
  },
  {
    title: "Jobs matched to you",
    description: "A request matches to a provider who actually offers that service in that area — not a random assignment.",
  },
  {
    title: "Customers request in minutes",
    description: "Pick a service, describe the job, and get matched — no phone tag, no waiting for a callback quote.",
  },
  {
    title: "Payment tracked per job",
    description: "What's owed and collected is tied to the booking it belongs to — a clear record every time.",
  },
  {
    title: "Ratings build your reputation",
    description: "Every completed job leaves a rating, building a real track record over time — good work gets noticed.",
  },
  {
    title: "No-code, same as every module",
    description: "The service catalog, fields, and provider roster are managed without custom development.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Sign up free", description: "Providers self-signup with their skill level; no fee to join." },
  { step: "2", title: "Get your login", description: "A real account to receive, accept, and manage job requests." },
  { step: "3", title: "Customers request a service", description: "They pick a service, describe the job, and get matched by service and pincode." },
  { step: "4", title: "Do the job, get paid, get rated", description: "Payment is tracked per booking, and every completed job builds your rating." },
];

const FAQS = [
  { q: "Does it cost anything to join as a provider?", a: "No — signing up is free. The platform only earns a small commission per completed, paid booking." },
  { q: "Can I tell skilled and unskilled providers apart?", a: "Yes — every provider carries a real skill level, and services can require a minimum skill level, so dispatch respects it." },
  { q: "How do providers get onboarded?", a: "Self-signup is the main path — an admin or team lead can also onboard a provider directly." },
  { q: "Do customers need an account to book?", a: "They need a lightweight customer login (separate from provider accounts), not a full business signup." },
  { q: "Is payment tracked per job?", a: "Yes — payment collection is tied to each booking, not a separate ledger to reconcile by hand." },
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

      <header className="flex flex-wrap items-center justify-between gap-y-3 border-b border-border px-6 py-5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandLogo height={36} />
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link href="/solutions/service-centre" className="text-text-muted hover:text-text">Service Centre</Link>
          <Link href="/solutions/telecalling" className="text-text-muted hover:text-text">Telecalling</Link>
          <Link href="/pricing" className="text-text-muted hover:text-text">Pricing</Link>
          <Link href="/login" className="text-text-muted hover:text-text">Sign in</Link>
          <Link href={PROVIDER_SIGNUP_HREF} className="btn-accent mbf-cta-glow">Get started</Link>
        </nav>
      </header>

      <section className="px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Field Force — free to join</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          Earn as a <span className="mbf-headline-mark">service provider</span>, or get help fast as a customer.
        </h1>
        <p className="mbf-prose mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          Skilled or unskilled, sign up free and get your own login to receive real job requests. Need a service
          done? Request one and get matched to a provider near you.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={PROVIDER_SIGNUP_HREF} className="btn-accent mbf-cta-glow">Join as a Provider — free</Link>
          <Link href={CUSTOMER_SIGNUP_HREF} className="btn-outline">Request a Service</Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Everything the marketplace needs</h2>
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
        <h2 className="font-display text-2xl font-bold text-text">Ready to get started?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href={PROVIDER_SIGNUP_HREF} className="btn-accent mbf-cta-glow">Join as a Provider — free</Link>
          <Link href={CUSTOMER_SIGNUP_HREF} className="btn-outline">Request a Service</Link>
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
