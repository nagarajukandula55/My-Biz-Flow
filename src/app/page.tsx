import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicHelpBubble } from "@/components/PublicHelpBubble";
import { registerPage } from "@/lib/designer/registry";
import { listActivePartnerTypes } from "@/lib/designer/partnerTypesData";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { MODULES, type ModuleDefinition } from "@/lib/designer/modules";
import { getIconComponent } from "@/lib/designer/icons";

// Public marketing homepage — reads Super-Admin-configured partner type
// list, which changes rarely. ISR keeps it fresh within a minute without a
// DB hit on every visitor/crawler request.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Run Every Part of Your Business From One Platform",
  description:
    "My Biz Flow brings your checkout, workorders, billing, GST invoicing, inventory, and patient/client records onto one account — so your team stops juggling separate apps and everything stays in sync automatically.",
  // Canonical stays the base "/" regardless of ?type= -- the Service Centre
  // variant is a content branch of the same page/URL, not a distinct page,
  // so a separate canonical would just create duplicate-content confusion.
  alternates: { canonical: "/" },
};

const FAQS = [
  {
    question: "What is My Biz Flow?",
    answer:
      "My Biz Flow is one platform that runs a business end to end — checkout, workorders, billing, inventory, staff, and more — instead of stitching together a separate app for each job. The same platform can run a service centre, a POS-driven retail store, a clinic, or an HR operation, all under one login.",
  },
  {
    question: "Which kinds of businesses can use it?",
    answer:
      "Any business that fits one or more of the platform's modules — Point of Sale, Service Centre (repair/workorder shops), Billing, Clinic, Inventory/Warehouse, and other verticals such as real estate, education, and manufacturing. A business picks a business type at signup, which bundles a starting set of modules; modules can be mixed and matched afterward.",
  },
  {
    question: "Do I need developers to set this up?",
    answer:
      "No — you set up fields, statuses, and page labels yourself from an admin screen, the same way you'd fill in a settings page, so a new module is ready to use the same day rather than waiting on a custom build.",
  },
  {
    question: "Does My Biz Flow support GST billing?",
    answer:
      "Yes. The Billing module handles invoicing, and the Accounting/GST Compliance module covers India-specific tax and e-invoicing needs for businesses that require it.",
  },
  {
    question: "How does pricing work?",
    answer:
      "Plans are tiered by how many users, locations, and modules are included, with pricing shown on the pricing page. All tiers use the same no-code platform — higher tiers unlock more modules and seats, not a different product.",
  },
];

// Service Centre (repair/workorder shop) specific FAQ content, folded into
// the same FAQPage JSON-LD as FAQS when the Service Centre variant renders,
// per the Service Centre module's real, verified capabilities (see
// src/lib/sample-data/service-centre.ts and src/app/service-centre-track):
// a Created -> In Progress -> Completed -> Closed workorder lifecycle,
// fault/symptom/solution catalogs, inventory-linked stock deduction on
// repair, GST invoicing generated from a closed workorder, and a public
// no-login tracking page. Deliberately no e-signature/agreements or
// multi-staff-login claims -- those aren't built.
const SERVICE_CENTRE_FAQS = [
  {
    question: "What does the Service Centre module actually track?",
    answer:
      "Every workorder from intake to close: fault/symptom/solution details from a live catalog, brand/model selection, a Created → In Progress → Completed → Closed lifecycle, and the parts and labour line items tied to it.",
  },
  {
    question: "Can customers check on their repair without logging in?",
    answer:
      "Yes — each workorder gets a public tracking link (no account needed) that shows its current stage, so a customer can check repair status without calling in.",
  },
  {
    question: "Does closing a workorder handle billing and stock automatically?",
    answer:
      "Closing a workorder can generate a GST-compliant invoice directly from its parts and labour line items, and parts used are deducted from Inventory automatically — so billing and stock stay in sync with what was actually repaired.",
  },
];

// Icon per module for the homepage's "All modules" grid — reuses the same
// curated lucide-react subset the Designer's module-appearance picker draws
// from (src/lib/designer/icons.ts), never a new icon choice invented for
// this page. Purely a display default; a Super Admin's real icon override
// (ModuleDefinition.icon) isn't read here since this is the anonymous
// marketing page, not a partner's own sidebar.
const MODULE_ICON_NAMES: Record<string, string> = {
  pos: "ShoppingCart",
  "service-centre": "Wrench",
  billing: "Receipt",
  brand: "Building2",
  clinic: "Stethoscope",
  "amc-field-service": "ClipboardCheck",
  "restaurant-pos": "UtensilsCrossed",
  subscriptions: "Dumbbell",
  "real-estate": "Home",
  rentals: "CalendarDays",
  education: "GraduationCap",
  manufacturing: "Factory",
  "wholesale-b2b": "Boxes",
  "logistics-fleet": "Truck",
  legal: "Scale",
  "event-booking": "PartyPopper",
  "salon-spa": "Scissors",
  inventory: "Warehouse",
  "accounting-gst": "FileSpreadsheet",
  accounting: "Landmark",
  "loyalty-rewards": "Gift",
  hrms: "UserCog",
  marketplace: "Store",
  "field-force": "Users",
  telecalling: "Phone",
};

// Modules with their own dedicated /solutions/<slug> marketing page.
const MODULE_SOLUTIONS_SLUGS = new Set(["service-centre", "telecalling", "field-force", "pos"]);

// The "Core four" per src/lib/designer/modules.ts's own grouping comment.
const CORE_MODULE_SLUGS = ["pos", "service-centre", "billing", "brand"];

registerPage({
  id: "platform.home",
  moduleSlug: "platform",
  title: "Home",
  path: "/",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public marketing home page (no AppShell). Hero, a 'choose your business type' section pulling live Active Partner Types from the PartnerType Prisma table (each card links to /signup?type=<id>, so the home page can never drift from what Super Admin has actually configured), and a screenshots section with real screenshots of the running app (public/screenshots/*.png), captured from the standing DEMO0001 demo partner account (see scripts/create-demo-partner.ts / src/lib/demoPartnerSeed.ts) so they're always real product, never mockups. CTAs to /signup and /pricing.",
  sourceFile: "src/app/page.tsx",
});

// dashboard/workorders/analytics — every partner can reach all three with
// just a normal login; the original list also had "pos-list" and
// "designer", but POS isn't in the Service Centre PartnerType's own
// defaultModules and Designer is a Super-Admin-only tool that moved to a
// separate app entirely (see CLAUDE.md) — neither is real content a
// prospective customer needs to see on this page anyway.
const SCREENSHOTS: { name: string; alt: string }[] = [
  { name: "dashboard", alt: "A partner dashboard showing live revenue stat tiles and a workorder overview" },
  { name: "workorders", alt: "The Service Centre workorders list with real filters and lifecycle status chips" },
  { name: "analytics", alt: "The Analytics page's revenue/workorder trend chart and summary cards" },
];

export default async function RootPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const partnerTypes = await listActivePartnerTypes();
  const partnerTypeIds = new Set(partnerTypes.map((t) => t.id));

  // Where a module's card links: its own /solutions page if one exists,
  // else /signup?type=<slug> if it's a real registerable PartnerType, else
  // no link at all -- a cross-cutting add-on (HRMS, Accounting, Marketplace,
  // Inventory, etc.) isn't something a business signs up for on its own,
  // it's picked as part of an account during signup, so its card is
  // informational only rather than pointing at a form that doesn't apply.
  function moduleHref(slug: string): string | null {
    if (MODULE_SOLUTIONS_SLUGS.has(slug)) return `/solutions/${slug}`;
    if (partnerTypeIds.has(slug)) return `/signup?type=${encodeURIComponent(slug)}`;
    return null;
  }

  const coreModules = CORE_MODULE_SLUGS.map((slug) => MODULES.find((m) => m.slug === slug)).filter(
    (m): m is ModuleDefinition => Boolean(m)
  );
  const verticalModules = MODULES.filter((m) => m.taxonomy === "vertical" && !CORE_MODULE_SLUGS.includes(m.slug));
  const crossCuttingModules = MODULES.filter((m) => m.taxonomy === "cross-cutting");

  function ModuleCard({ mod, featured }: { mod: ModuleDefinition; featured?: boolean }) {
    const Icon = getIconComponent(MODULE_ICON_NAMES[mod.slug]);
    const href = moduleHref(mod.slug);
    const card = (
      <div className={`mbf-glass-card flex h-full flex-col gap-3 p-5 ${featured ? "ring-1 ring-accent/50" : ""}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
        <div className="flex-1">
          <h3 className="font-display text-base font-bold text-text">{mod.label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{mod.description}</p>
        </div>
        {href && <span className="text-xs font-semibold text-accent">Learn more →</span>}
      </div>
    );
    return href ? (
      <Link href={href} className="block h-full">
        {card}
      </Link>
    ) : (
      card
    );
  }

  // Service Centre variant triggers on an explicit ?type=service-centre
  // (e.g. arriving from the pricing/signup business-type chooser), or when
  // Service Centre is the only active business type configured at all --
  // in which case the generic multi-vertical pitch would be misleading.
  const isServiceCentre =
    searchParams.type === "service-centre" ||
    (partnerTypes.length === 1 && partnerTypes[0].id === "service-centre");
  const faqs = isServiceCentre ? [...FAQS, ...SERVICE_CENTRE_FAQS] : FAQS;

  // Structured data for both classic search rich results and AI answer
  // engines (GEO) -- SoftwareApplication describes what the product is and
  // links to real pricing, Organization anchors the brand identity, and
  // FAQPage exposes the same Q&A pairs rendered below in a form these
  // engines can extract directly. Every claim here matches copy elsewhere
  // on the page -- no invented stats, ratings, or user counts. Kept in
  // sync with whichever variant (generic vs Service Centre) is actually
  // rendered below.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: isServiceCentre
        ? "Service Centre / repair-shop platform: workorder lifecycle tracking, fault/symptom/solution catalogs, inventory-linked GST billing, and public no-login repair tracking, on the same My Biz Flow platform."
        : "Run checkout, service workorders, billing, inventory, and more from one account — mix and match POS, Service Centre, Billing, Clinic, Inventory, and other modules without juggling separate apps.",
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/pricing${isServiceCentre ? "?type=service-centre" : ""}`,
        priceCurrency: "INR",
        category: "SaaS subscription",
      },
      areaServed: {
        "@type": "Country",
        name: "India",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHelpBubble />
      <PublicHeader
        links={[
          { href: "/pricing", label: "Pricing" },
          { href: "/track", label: "Track My Repair" },
          { href: "/book-appointment", label: "Book Appointment" },
          { href: "/downloads", label: "Downloads" },
          { href: "/help", label: "Help" },
        ]}
        ctaClassName="mbf-cta-glow"
      />

      <section className="px-6 py-20 text-center">
        {isServiceCentre ? (
          <>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
              Run your <span className="mbf-headline-mark">service centre</span> from one screen.
            </h1>
            <p className="mbf-prose mx-auto mt-5 text-lg leading-relaxed text-text-muted">
              My Biz Flow's Service Centre module takes a repair from intake to invoice without switching tools —
              log the fault, move the workorder through its lifecycle, and bill it out with
              GST-compliant invoicing that deducts the parts used straight from Inventory.
            </p>
          </>
        ) : (
          <>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
              One platform. <span className="mbf-headline-mark">Every business you run.</span>
            </h1>
            <p className="mbf-prose mx-auto mt-5 text-lg leading-relaxed text-text-muted">
              Stop juggling a different app for checkout, billing, workorders, and stock. My Biz Flow puts them all on
              one account, with one login for your whole team — mix and match POS, Service Centre, Telecalling,
              Billing, Clinic, and more, and they all stay in sync automatically.
            </p>
          </>
        )}

        {/* Concrete workorder lifecycle, in place of a generic icon badge --
            this is a real product mechanic, not decoration. */}
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-3">
          {["Created", "In Progress", "Completed", "Closed"].map((stage, i, arr) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-bg-raised px-3 py-1 text-xs font-semibold text-text-muted">
                {stage}
              </span>
              {i < arr.length - 1 && <span className="text-text-muted">→</span>}
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href={isServiceCentre ? "/signup?type=service-centre" : "/signup"} className="btn-accent mbf-cta-glow">
            Register your business
          </Link>
          <Link href={isServiceCentre ? "/pricing?type=service-centre" : "/pricing"} className="btn-outline">
            See pricing
          </Link>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-accent">
              {isServiceCentre ? "The module" : "Spotlight module"}
            </p>
            <h2 className="mt-2 text-center font-display text-2xl font-bold text-text">
              Built around the real repair workflow
            </h2>
            <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
              Not a generic ticketing tool bent into shape — these are the actual capabilities of the Service Centre
              module, ready the moment you sign up.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Full workorder lifecycle",
                  description:
                    "Created → In Progress → Completed → Closed, with fault/symptom/solution details and brand/model on every job.",
                },
                {
                  title: "Public repair tracking",
                  description:
                    "Every workorder gets a shareable tracking link — customers check status without an account or a phone call.",
                },
                {
                  title: "Inventory-linked billing",
                  description:
                    "Close a workorder and it can generate a GST-compliant invoice from the parts and labour used, deducting stock from Inventory automatically.",
                },
                {
                  title: "Set up your way, same as every module",
                  description:
                    "Fields, statuses, and catalogs are yours to tailor from an admin screen — set up Service Centre to match how your shop actually works, no waiting on a developer.",
                },
              ].map((f) => (
                <div key={f.title} className="mbf-glass-card p-5">
                  <h3 className="font-display text-base font-bold text-text">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{f.description}</p>
                </div>
              ))}
            </div>
            {!isServiceCentre && (
              <div className="mt-8 text-center">
                <Link href="/signup?type=service-centre" className="btn-accent mbf-cta-glow">
                  Sign up as Service Centre
                </Link>
              </div>
            )}
          </div>
        </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-accent">All modules</p>
          <h2 className="mt-2 text-center font-display text-2xl font-bold text-text">
            Everything your business needs, on one account
          </h2>
          <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
            Turn on what you run today, add more the day you need it — no separate logins, no re-entering the same
            customer or product twice.
          </p>

          <h3 className="mt-10 font-display text-sm font-bold uppercase tracking-wide text-text-muted">Core</h3>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {coreModules.map((m) => (
              <ModuleCard key={m.slug} mod={m} featured={m.slug === "pos"} />
            ))}
          </div>

          <h3 className="mt-12 font-display text-sm font-bold uppercase tracking-wide text-text-muted">Verticals</h3>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {verticalModules.map((m) => (
              <ModuleCard key={m.slug} mod={m} />
            ))}
          </div>

          <h3 className="mt-12 font-display text-sm font-bold uppercase tracking-wide text-text-muted">
            Cross-cutting add-ons
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {crossCuttingModules.map((m) => (
              <ModuleCard key={m.slug} mod={m} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Choose your business type</h2>
          <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
            Pick the type that matches how you run your business — everything else (modules, pricing tiers)
            is configured for you.
          </p>
          {partnerTypes.length === 0 ? (
            <p className="mx-auto mt-10 max-w-md rounded-lg border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
              No business types are available for signup yet — check back soon.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {partnerTypes.map((t) => (
                <div key={t.id} className="mbf-glass-card flex flex-col p-5">
                  <h3 className="font-display text-base font-bold text-text">{t.id}</h3>
                  <p className="mt-1 flex-1 text-sm text-text-muted">{t.description || "—"}</p>
                  <div className="mt-4 flex items-center gap-3">
                    {t.id === "field-force" ? (
                      // Field Force isn't a business you register for a paid
                      // account — it's a free marketplace individuals join
                      // directly (see /solutions/field-force), so it skips
                      // the generic business-registration signup form.
                      <Link href="/solutions/field-force" className="btn-accent mbf-cta-glow flex-1 text-center">
                        Join or request a service — free
                      </Link>
                    ) : (
                      <>
                        <Link href={`/signup?type=${encodeURIComponent(t.id)}`} className="btn-accent mbf-cta-glow flex-1 text-center">
                          Sign up as {t.id}
                        </Link>
                        {(t.id === "service-centre" || t.id === "telecalling") && (
                          <Link href={`/solutions/${t.id}`} className="btn-outline shrink-0">
                            Learn more
                          </Link>
                        )}
                      </>
                    )}
                  </div>
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
            Real screens from the running app — no mockups.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SCREENSHOTS.map((s) => (
              <div key={s.name} className="mbf-glass-card overflow-hidden bg-bg-sunken">
                <Image
                  src={`/screenshots/${s.name}.png`}
                  alt={s.alt}
                  width={480}
                  height={300}
                  className="h-auto w-full bg-bg-sunken object-cover"
                  loading="lazy"
                  sizes="(min-width: 640px) 33vw, 100vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-bold text-text">Frequently asked questions</h2>
          <div className="mt-10 space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-display text-base font-bold text-text">{faq.question}</h3>
                <p className="mbf-prose mt-1.5 text-sm leading-relaxed text-text-muted">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-raised px-6 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-text">Ready to set up your business?</h2>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/signup" className="btn-accent mbf-cta-glow">
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
          <Link href="/track" className="hover:text-text">
            Track My Repair
          </Link>
          <Link href="/book-appointment" className="hover:text-text">
            Book Appointment
          </Link>
          <Link href="/downloads" className="hover:text-text">
            Downloads
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
