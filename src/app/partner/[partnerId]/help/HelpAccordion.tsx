"use client";

import { useEffect, useState } from "react";
import type { HelpSection } from "./page";
import { helpSectionSlug } from "@/lib/helpSlug";

/**
 * Expand/collapse accordion for the static Help & Tutorials content —
 * split into its own Client Component so the page itself (HELP_SECTIONS,
 * registerPage) can stay a plain Server Component. Each section has a real
 * `id` (helpSectionSlug) so a link like /partner/<id>/help#billing-invoices
 * scrolls straight to it and expands its first item — used by the Support
 * Widget's auto-reply rules (supportAutoReply.ts) to point at the exact
 * relevant section instead of just the top of the page.
 */
export function HelpAccordion({ sections }: { sections: HelpSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const section = sections.find((s) => helpSectionSlug(s.title) === hash);
    if (!section) return;
    // Open the section's first item (there's no "open a whole section" state,
    // only per-item) and scroll the section heading into view.
    setOpenKey(`${section.title}::${section.items[0]?.q}`);
    document.getElementById(hash)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-6 space-y-8">
      {sections.map((section) => (
        <div key={section.title} id={helpSectionSlug(section.title)}>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {section.title}
          </div>
          <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-raised">
            {section.items.map((item) => {
              const key = `${section.title}::${item.q}`;
              const isOpen = openKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="block w-full px-4 py-3 text-left hover:bg-bg-sunken"
                >
                  <p className="text-sm font-medium text-text">{item.q}</p>
                  {isOpen && (
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{item.a}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
