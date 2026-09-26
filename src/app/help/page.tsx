import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { registerPage } from "@/lib/designer/registry";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { tPublic } from "@/lib/i18n/publicLocales";
import "@/lib/designer/registerAll";

export const metadata: Metadata = {
  title: "Help & Documentation",
  description:
    "How My Biz Flow's Partner/module concept works, sidebar navigation, and answers to common questions about the platform.",
  alternates: { canonical: "/help" },
};

registerPage({
  id: "platform.help",
  moduleSlug: "platform",
  title: "Help & Documentation",
  path: "/help",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "General-purpose help/documentation page, visible to any signed-in user (not partner-scoped, not Super-Admin-gated). Explains the Partner/module concept, sidebar navigation, the Create/Edit/Delete pattern used across every module, and answers common questions — the first place a new user should land when they're unsure how the product works.",
  sourceFile: "src/app/help/page.tsx",
});

// Translated via tPublic() inside HelpPage — key pairs kept here so the
// English source strings live in one place (src/lib/i18n/dict-public/en.ts).
const HELP_FAQ_KEYS = [
  ["hFaq1Q", "hFaq1A"],
  ["hFaq2Q", "hFaq2A"],
  ["hFaq3Q", "hFaq3A"],
  ["hFaq4Q", "hFaq4A"],
  ["hFaq5Q", "hFaq5A"],
  ["hFaq6Q", "hFaq6A"],
  ["hFaq7Q", "hFaq7A"],
  ["hFaq8Q", "hFaq8A"],
  ["hFaq9Q", "hFaq9A"],
] as const;

export default function HelpPage() {
  const locale = getLocaleFromCookie();
  const tp = (key: Parameters<typeof tPublic>[1], vars?: Record<string, string | number>) => tPublic(locale, key, vars);
  const faqs = HELP_FAQ_KEYS.map(([qKey, aKey]) => ({ q: tp(qKey), a: tp(aKey) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo height={30} />
        </Link>
        <LanguageSwitcher current={locale} />
      </header>
      <div>
        <div className="mbf-prose">
          <h1 className="font-display text-3xl font-bold text-text">{tp("helpTitle")}</h1>
          <p className="mt-3 text-base leading-relaxed text-text-muted">
            {tp("helpIntro")}
          </p>

          <p className="mt-4">
            <Link href="/help/modules" className="text-accent hover:underline">
              {tp("seeModuleGuide")}
            </Link>{" "}
            {tp("moduleGuideFollowup")}{" "}
            <Link href="/pricing" className="text-accent hover:underline">
              {tp("pricingLinkLabel")}
            </Link>{" "}
            {tp("toSeePlans")}
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">
            {tp("partnerConceptTitle")}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            {tp("partnerConceptBody")}
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">
            {tp("sidebarTitle")}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            {tp("sidebarBody")}
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">
            {tp("cedTitle")}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            {tp("cedBody")}
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">{tp("helpFaqTitle")}</h2>
          <dl className="mt-4 space-y-6">
            {faqs.map((item) => (
              <div key={item.q}>
                <dt className="font-display text-base font-bold text-text">{item.q}</dt>
                <dd className="mt-1.5 text-base leading-relaxed text-text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
