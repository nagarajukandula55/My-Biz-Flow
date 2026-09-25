import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { registerPage } from "@/lib/designer/registry";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

registerPage({
  id: "platform.solutions.pos",
  moduleSlug: "platform",
  title: "Solutions — POS",
  path: "/solutions/pos",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Full marketing/feature page for the POS module — every real, verified capability, not aspirational copy: multi-staff login with Cashier/Manager roles, till/cash-session open-close-reconcile with variance tracking, checkout with server-recomputed totals, live stock deduction into Inventory on sale, returns/refunds, receipt printing, and the automatic Billing invoice created from every sale (see completeSaleAction in src/app/partner/[partnerId]/pos/checkout/actions.ts).",
  sourceFile: "src/app/solutions/pos/page.tsx",
});

export const metadata: Metadata = {
  title: "POS Software — Checkout, Till & Stock in One Counter",
  description:
    "Ring up sales fast, keep every cashier accountable with their own login, reconcile cash at the end of every shift, and let a sale update your stock and raise a GST invoice automatically — no separate billing or inventory app to keep in sync.",
  alternates: { canonical: "/solutions/pos" },
};

const PERKS = [
  {
    title: "Every cashier has their own login",
    description:
      "Staff sign in with their own code and role — Cashier or Manager — so every sale, void, and till close is tied to a real person, not a shared terminal login.",
  },
  {
    title: "Cash drawer that reconciles itself",
    description:
      "Open a till with a counted starting float, ring up sales against it, and close the shift by counting cash again — the system tells you the expected total and the exact variance, so short/over drawers show up the same day, not at month-end.",
  },
  {
    title: "Checkout that doesn't trust the screen",
    description:
      "Every sale total is recalculated on the server from the actual cart, not whatever the browser sent — split tenders (cash, UPI, card, wallet) are supported, and change due is computed automatically.",
  },
  {
    title: "Stock updates itself the moment you sell",
    description:
      "Selling a product deducts it from Inventory in the same step as the sale — no separate stock adjustment to remember, and a sale is blocked outright if there isn't enough stock to cover it.",
  },
  {
    title: "Returns hand money back correctly",
    description:
      "Process a return against any past sale, choose the refund method, and the returned quantity goes straight back into stock — tracked against whichever till session is open at the time.",
  },
  {
    title: "Billing happens without a second step",
    description:
      "Every completed sale automatically creates a real Billing invoice with full line-item detail and GST treatment, and prints as a receipt (thermal, A4, or A5) — no re-entering the sale into a separate invoicing tool.",
  },
  {
    title: "One record of the day, not five",
    description:
      "Sales, tenders, cashier, till session, and linked invoice all live on the same sale record — a Manager can see exactly what happened on a shift without cross-referencing a separate spreadsheet.",
  },
  {
    title: "Set up for how your counter actually runs",
    description:
      "Products, taxes, and receipt fields are configured for your business, not hard-coded to someone else's retail layout — the same underlying platform every My Biz Flow module runs on.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "A cashier signs in", description: "With their own staff code and role — the first person to sign up on an outlet becomes its Manager; everyone after picks their role at signup." },
  { step: "2", title: "Open the till", description: "Count the starting cash float and open a session for that outlet — a sale can't ring up without one." },
  { step: "3", title: "Ring up the sale", description: "Add line items, take payment (cash, UPI, card, or split across tenders), and the total, change due, and stock deduction all happen together." },
  { step: "4", title: "Close and reconcile", description: "At end of shift, count the drawer — the system shows the expected cash total from opening float plus cash sales, and the variance if it doesn't match." },
];

const FAQS = [
  { q: "Does a POS sale really update Inventory, or is that just a note on the receipt?", a: "Real — completing a sale deducts the sold quantities from your Inventory module's live stock in the same step, and a sale is rejected if there isn't enough stock on hand to cover it." },
  { q: "Can more than one cashier use the same till on different shifts?", a: "Yes — each staff member signs in with their own code, and a till session records exactly who opened it and who closed it, so a shift handover doesn't lose accountability." },
  { q: "What happens if the counted cash doesn't match what the system expects?", a: "Closing a till still goes through — the variance (counted cash minus expected cash) is recorded on the session, not hidden, so a Manager can see and follow up on it." },
  { q: "Does every sale need to create an invoice?", a: "Yes — every completed sale automatically creates a linked Billing invoice with full line-item and GST detail, so there's a paper trail for every transaction without re-entering it elsewhere." },
  { q: "Can a customer return an item after the sale?", a: "Yes — a return can be processed against the original sale for any of its lines, with the refund method recorded and the returned stock added back to Inventory." },
];

export default function PosSolutionPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${SITE_NAME} POS`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/solutions/pos`,
      description: metadata.description,
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/pricing`,
        priceCurrency: "INR",
        category: "SaaS subscription",
      },
      areaServed: { "@type": "Country", name: "India" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "POS", item: `${SITE_URL}/solutions/pos` },
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
        ctaHref="/signup"
        ctaClassName="mbf-cta-glow"
      />

      <section className="px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">POS</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
          Fast checkout, an <span className="mbf-headline-mark">honest cash drawer</span>, stock that keeps up.
        </h1>
        <p className="mbf-prose mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          Ring up a sale, and everything else follows — the till reconciles, stock comes down, and a GST invoice is
          raised, all without touching a second app. Every cashier signs in with their own login, so you always know
          who rang up what.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing" className="btn-outline">See pricing</Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Everything a retail counter actually needs</h2>
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
        <h2 className="font-display text-2xl font-bold text-text">Ready to run your counter from one screen?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="btn-accent mbf-cta-glow">Start free</Link>
          <Link href="/pricing" className="btn-outline">See pricing</Link>
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
