import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { registerPage } from "@/lib/designer/registry";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

registerPage({
  id: "platform.solutions.telecalling",
  moduleSlug: "platform",
  title: "Solutions — Telecalling",
  path: "/solutions/telecalling",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Full marketing/feature page for the Telecalling business type — a real, signup-able Partner Type (PartnerType.id 'telecalling', idPrefix 'CC', real Plan pricing) same as Service Centre, not an add-on. Real, verified capabilities only: bulk lead upload, agent logins separate from the owner's, click-to-call, SMS/WhatsApp templates, and territory-based auto-assignment (src/lib/designer/modules.ts's own module description).",
  sourceFile: "src/app/solutions/telecalling/page.tsx",
});

export const metadata: Metadata = {
  title: "Telecalling Software for Lead Follow-up",
  description:
    "Bulk-upload a contact list, assign it to telecaller agents with their own logins, click-to-call straight from the app, and trigger SMS/WhatsApp templates per contact — with territory-based auto-assignment so new leads reach the right agent automatically.",
  alternates: { canonical: "/solutions/telecalling" },
};

const PERKS = [
  {
    title: "Bulk lead upload",
    description: "Bring in a contact list and get every lead into a working queue immediately, instead of typing them in one by one.",
  },
  {
    title: "Agents get their own login",
    description: "Telecaller agents sign in independently with a generated Agent ID — not your business owner login, and no email required to onboard one.",
  },
  {
    title: "Territory-based auto-assignment",
    description: "Assign an agent a set of states/cities and new matching leads route to them automatically going forward — leave it blank and they see everything, unrestricted.",
  },
  {
    title: "Click-to-call",
    description: "Dial straight from the lead record to the phone's own dialer — no separate softphone tab to juggle.",
  },
  {
    title: "SMS/WhatsApp templates",
    description: "Trigger a welcome message, a product link, or a follow-up template per contact without leaving the call queue.",
  },
  {
    title: "A real queue, not a spreadsheet",
    description: "Leads move through the queue with call dispositions logged, so nothing sits untouched because nobody remembered to follow up.",
  },
  {
    title: "Its own business type, priced separately",
    description: "Sign up as a Telecalling business directly — its own pricing, its own account, not bundled into another module.",
  },
  {
    title: "No-code, same as every module",
    description: "A Super Admin manages agents, fields, and templates without custom development — same Designer system every module in this platform uses.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Upload your contact list", description: "Bring in leads in bulk, ready for your team to start calling immediately." },
  { step: "2", title: "Assign agents & territory", description: "Create agent logins and, optionally, restrict each one to the states/cities they cover — new matching leads auto-assign from there." },
  { step: "3", title: "Call, message, log", description: "Agents work the queue: click-to-call, send an SMS/WhatsApp template, and log the disposition, all from one screen." },
  { step: "4", title: "See what's working", description: "Track the queue and outcomes centrally, without chasing individual agents for a status update." },
];

const FAQS = [
  { q: "Do telecaller agents need their own email to log in?", a: "No — an Agent ID (e.g. AGT001) is generated automatically, and the agent signs in with that, not an email." },
  { q: "Can I restrict which leads an agent sees?", a: "Yes — assign them a territory (states and/or cities) and they'll only see and be auto-assigned leads matching it; leaving it blank gives them everything." },
  { q: "Is Telecalling its own account, or does it come bundled with another module?", a: "It's its own business type with its own signup and pricing — same as Service Centre. Pick it directly at signup." },
  { q: "What messaging channels are supported?", a: "SMS and WhatsApp template messages, triggered per contact from the call queue." },
];

export default function TelecallingSolutionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Telecalling / Tele-marketing Software",
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      areaServed: "IN",
      description: metadata.description,
      url: `${SITE_URL}/solutions/telecalling`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Telecalling", item: `${SITE_URL}/solutions/telecalling` },
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

      <PublicHeader
        links={[
          { href: "/solutions/service-centre", label: "Service Centre" },
          { href: "/pricing", label: "Pricing" },
        ]}
        ctaHref="/signup/telecalling"
        ctaClassName="mbf-cta-glow"
      />

      <section className="px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Telecalling</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          Turn a contact list into <span className="mbf-headline-mark">calls that get made</span>.
        </h1>
        <p className="mbf-prose mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          Bulk-upload leads, hand them to agents with their own logins, click-to-call from the app, and trigger
          SMS/WhatsApp templates — its own business type, with its own pricing.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup/telecalling" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing?type=telecalling" className="btn-outline">See pricing</Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Everything a telecalling team actually needs</h2>
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
        <h2 className="font-display text-2xl font-bold text-text">Ready to put your lead list to work?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup/telecalling" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing?type=telecalling" className="btn-outline">See pricing</Link>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <Link href="/" className="hover:text-text">Home</Link>
          <Link href="/solutions/service-centre" className="hover:text-text">Service Centre</Link>
          <Link href="/pricing" className="hover:text-text">Pricing</Link>
          <Link href="/contact" className="hover:text-text">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
