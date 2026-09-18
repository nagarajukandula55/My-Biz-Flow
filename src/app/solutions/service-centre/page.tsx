import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

registerPage({
  id: "platform.solutions.service-centre",
  moduleSlug: "platform",
  title: "Solutions — Service Centre",
  path: "/solutions/service-centre",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Full marketing/feature page for the Service Centre vertical — every real, verified capability, not aspirational copy: workorder lifecycle, public tracking, GST invoicing with inventory deduction, the Inquiry/Book Appointment intake funnel, and the partner Service Area configuration that routes public bookings.",
  sourceFile: "src/app/solutions/service-centre/page.tsx",
});

export const metadata: Metadata = {
  title: "Service Centre Software — Workorders, Billing & Inventory | My Biz Flow",
  description:
    "Run a repair/service business end to end: intake as an inquiry or workorder, track the fault-to-fix lifecycle, bill with GST-compliant invoices that deduct parts from inventory automatically, and let customers book appointments and track repairs online with no login.",
  alternates: { canonical: "/solutions/service-centre" },
};

const PERKS = [
  {
    title: "Full workorder lifecycle",
    description: "Created → In Progress → Completed → Closed, with fault/symptom/solution catalogs and brand/model on every job — nothing falls through as a sticky note.",
  },
  {
    title: "Inquiry & Book Appointment intake",
    description: "Customers request onsite or walk-in service from your public booking page with no login, or staff log a call-in inquiry — either way it's tracked from first contact, not just from workorder creation.",
  },
  {
    title: "Auto-routes to the right centre",
    description: "Configure which pincodes and service types you cover once, and public bookings in your area assign to you automatically — with a Telegram alert the moment one lands.",
  },
  {
    title: "Public repair & appointment tracking",
    description: "Every workorder and inquiry gets a shareable tracking link — customers check status without an account, a login, or a phone call.",
  },
  {
    title: "Inventory-linked GST billing",
    description: "Close a workorder and generate a GST-compliant invoice straight from the parts and labour used, deducting stock from Inventory automatically — B2B or B2C, decided correctly by the customer's GSTIN.",
  },
  {
    title: "Real dashboard, not vanity charts",
    description: "Workorder volume, open/overdue/part-pending counts, and an Inquiry funnel (Open / Converted / Closed / conversion rate) so you can see where business is actually being won or lost.",
  },
  {
    title: "Telegram alerts, not another inbox",
    description: "New inquiry, new workorder, payment received, low stock — sent straight to the chat your team already checks, not a dashboard nobody opens.",
  },
  {
    title: "No-code, same as every module",
    description: "Fields, statuses, and catalogs are config-driven — a Super Admin can tailor Service Centre for your workflow without custom development.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "A customer reaches out", description: "Via your public Book Appointment page, a phone call your staff logs as an Inquiry, or a walk-in." },
  { step: "2", title: "You accept or decline", description: "Convert the Inquiry to a real workorder in one click, or close it with a standardised reason your dashboard can summarize." },
  { step: "3", title: "Track the repair", description: "Move it through Created → In Progress → Completed → Closed, logging parts and labour as you go — the customer can watch the same status on their own tracking link." },
  { step: "4", title: "Bill and restock, automatically", description: "Closing the job can raise a GST-compliant invoice and deduct the parts used from Inventory in the same step." },
];

const FAQS = [
  { q: "Can customers book an appointment without creating an account?", a: "Yes — the public Book Appointment page needs only a name, phone, pincode, and what's wrong. No login, no app to install." },
  { q: "What happens if no centre covers a customer's area yet?", a: "It's queued for your team to review and route manually (or, if you're the platform operator, to assign to any onboarded centre) rather than the request just disappearing." },
  { q: "Does closing a workorder always create an invoice?", a: "Only when there's something to bill — a job that needed no part and no chargeable service can still be closed without one." },
  { q: "Is the parts stock deduction real, or just a note on the invoice?", a: "Real — closing a workorder deducts the consumed part quantities from your Inventory module's live stock, the same mechanism POS checkout uses." },
];

export default function ServiceCentreSolutionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Service Centre Software",
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      areaServed: "IN",
      description: metadata.description,
      url: `${SITE_URL}/solutions/service-centre`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Service Centre", item: `${SITE_URL}/solutions/service-centre` },
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
          <Link href="/solutions/telecalling" className="text-text-muted hover:text-text">Telecalling</Link>
          <Link href="/pricing" className="text-text-muted hover:text-text">Pricing</Link>
          <Link href="/login" className="text-text-muted hover:text-text">Sign in</Link>
          <Link href="/signup?type=service-centre" className="btn-accent mbf-cta-glow">Get started</Link>
        </nav>
      </header>

      <section className="px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Service Centre</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          Every repair, from <span className="mbf-headline-mark">first call to closed invoice</span>.
        </h1>
        <p className="mbf-prose mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          Intake as an inquiry or a walk-in, move it through the real repair lifecycle, and close it with GST billing
          that deducts stock automatically — with a public booking page and tracking links your customers use without
          ever logging in.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup?type=service-centre" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/book-appointment" className="btn-outline">See the public booking page</Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Everything a repair shop actually needs</h2>
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
        <h2 className="font-display text-2xl font-bold text-text">Ready to run your service centre from one screen?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup?type=service-centre" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing" className="btn-outline">See pricing</Link>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <Link href="/" className="hover:text-text">Home</Link>
          <Link href="/solutions/telecalling" className="hover:text-text">Telecalling</Link>
          <Link href="/pricing" className="hover:text-text">Pricing</Link>
          <Link href="/track" className="hover:text-text">Track My Repair</Link>
          <Link href="/book-appointment" className="hover:text-text">Book Appointment</Link>
          <Link href="/contact" className="hover:text-text">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
