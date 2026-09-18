"use client";

import { useEffect, useState } from "react";
import type { HelpSection } from "./page";
import { helpSectionSlug } from "@/lib/helpSlug";
import { SUPPORT_LANGUAGES, DEFAULT_SUPPORT_LANGUAGE, type SupportLanguage } from "@/lib/i18n/supportLanguages";

/**
 * Expand/collapse accordion for the static Help & Tutorials content —
 * split into its own Client Component so the page itself (HELP_SECTIONS,
 * registerPage) can stay a plain Server Component. Each section has a real
 * `id` (helpSectionSlug) so a link like /partner/<id>/help#billing-invoices
 * scrolls straight to it and expands its first item — used by the Support
 * Widget's auto-reply rules (supportAutoReply.ts) to point at the exact
 * relevant section instead of just the top of the page.
 *
 * Each Q&A is stored per-language (page.tsx's LocalizedText, `en` always
 * present) — the language tab here picks which one renders, falling back
 * to English for any item not yet translated into the selected language
 * (translation coverage is added incrementally, section by section).
 */
export function HelpAccordion({ sections }: { sections: HelpSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportLanguage>(DEFAULT_SUPPORT_LANGUAGE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("anu-language");
      if (saved && SUPPORT_LANGUAGES.some((l) => l.code === saved)) setLanguage(saved as SupportLanguage);
    } catch {
      // storage unavailable — defaults to English
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const section = sections.find((s) => helpSectionSlug(s.title) === hash);
    if (!section) return;
    // Open the section's first item (there's no "open a whole section" state,
    // only per-item) and scroll the section heading into view.
    setOpenKey(`${section.title}::${section.items[0]?.q.en}`);
    document.getElementById(hash)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectLanguage(code: SupportLanguage) {
    setLanguage(code);
    try {
      localStorage.setItem("anu-language", code);
    } catch {
      // best-effort only
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {SUPPORT_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => selectLanguage(l.code)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              language === l.code
                ? "border-accent bg-accent text-white"
                : "border-border text-text-muted hover:bg-bg-sunken"
            }`}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} id={helpSectionSlug(section.title)}>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {section.title}
            </div>
            <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-raised">
              {section.items.map((item) => {
                const key = `${section.title}::${item.q.en}`;
                const isOpen = openKey === key;
                const q = item.q[language] ?? item.q.en;
                const a = item.a[language] ?? item.a.en;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    className="block w-full px-4 py-3 text-left hover:bg-bg-sunken"
                  >
                    <p className="text-sm font-medium text-text">{q}</p>
                    {isOpen && <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{a}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
