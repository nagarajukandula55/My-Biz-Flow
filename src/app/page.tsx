import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { listActivePartnerTypes } from "@/lib/designer/partnerTypesData";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "No-Code Business Management Platform for Service Businesses",
  description:
    "My Biz Flow is a modular, no-code business/CRM platform: mix and match POS, Service Centre workorders, Billing, GST-compliant invoicing, Inventory, HRMS, Clinic, and more on one account — no custom development required.",
  // Canonical stays the base "/" regardless of ?type= -- the Service Centre
  // variant is a content branch of the same page/URL, not a distinct page,
  // so a separate canonical would just create duplicate-content confusion.
  alternates: { canonical: "/" },
};

const FAQS = [
  {
    question: "What is My Biz Flow?",
    answer:
      "My Biz Flow is a modular, no-code, multi-vertical business/CRM platform. Instead of a separate product per industry, every business runs on one shared metadata engine — modules, fields, pipelines, and dashboards are all config-driven, so the same platform can run a service centre, a POS-driven retail store, a clinic, or an HR operation.",
  },
  {
    question: "Which kinds of businesses can use it?",
    answer:
      "Any business that fits one or more of the platform's modules — Point of Sale, Service Centre (repair/workorder shops), Billing, Clinic, HRMS, Inventory/Warehouse, and other verticals such as real estate, education, and manufacturing. A business picks a business type at signup, which bundles a starting set of modules; modules can be mixed and matched afterward.",
  },
  {
    question: "Is it really no-code?",
    answer:
      "Yes — modules, fields, pipelines, and dashboards are config-driven rather than requiring custom development per business. A Super Admin/Designer layer lets page fields, labels, and module appearance be customized without writing code.",
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

registerPage({
  id: "platform.home",
  moduleSlug: "platform",
  title: "Home",
  path: "/",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public marketing home page (no AppShell). Hero, a 'choose your business type' section pulling live Active Partner Types from the PartnerType Prisma table (each card links to /signup?type=<id>, so the home page can never drift from what Super Admin has actually configured), and a screenshots section referencing /screenshots/*.png files that don't exist yet (graceful bg-bg-sunken fallback boxes) — real screenshots to be added in a follow-up pass. CTAs to /signup and /pricing.",
  sourceFile: "src/app/page.tsx",
});

const SCREENSHOTS: { name: string; alt: string }[] = [
  { name: "dashboard", alt: "A partner dashboard showing live stat tiles and recent activity" },
  { name: "pos-list", alt: "The POS module's list view showing recent sales in a data table" },
  { name: "designer", alt: "The Super Admin Designer listing every registered page in the product" },
];

export default async function RootPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const partnerTypes = await listActivePartnerTypes();
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
        ? "No-code Service Centre / repair-shop platform: workorder lifecycle tracking, fault/symptom/solution catalogs, inventory-linked GST billing, and public no-login repair tracking, on the same modular My Biz Flow platform."
        : "Modular, no-code, multi-vertical business/CRM platform. Mix and match POS, Service Centre, Billing, Clinic, HRMS, Inventory, and more modules on one account.",
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
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <BrandLogo height={36} />
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
        {isServiceCentre ? (
          <>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold text-text sm:text-5xl">
              Run your service centre from one screen.
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
              One platform. Every business you run.
            </h1>
            <p className="mbf-prose mx-auto mt-5 text-lg leading-relaxed text-text-muted">
              My Biz Flow is a modular, no-code, multi-vertical business/CRM platform. Instead of shipping a separate
              product per industry, every business runs on one shared metadata engine — modules, fields, pipelines,
              and dashboards are all config-driven. Mix and match POS, Service Centre, Billing, Clinic, HRMS, and
              more on a single account.
            </p>
          </>
        )}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href={isServiceCentre ? "/signup?type=service-centre" : "/signup"} className="btn-accent">
            Register your business
          </Link>
          <Link href={isServiceCentre ? "/pricing?type=service-centre" : "/pricing"} className="btn-outline">
            See pricing
          </Link>
        </div>
      </section>

      {isServiceCentre && (
        <section className="border-t border-border px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-text">
              Built around the real repair workflow
            </h2>
            <p className="mbf-prose mx-auto mt-2 text-center text-base text-text-muted">
              Not a generic ticketing tool bent into shape — these are the actual capabilities of the Service Centre
              module.
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
                  title: "No-code, same as every module",
                  description:
                    "Fields, statuses, and catalogs are config-driven — a Super Admin can tailor Service Centre without custom development.",
                },
              ].map((f) => (
                <div key={f.title} className="rounded-lg border border-border bg-bg-raised p-5">
                  <h3 className="font-display text-base font-bold text-text">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
