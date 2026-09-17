"use client";

import { useState } from "react";
import type { HelpSection } from "./page";

/**
 * Expand/collapse accordion for the static Help & Tutorials content —
 * split into its own Client Component so the page itself (HELP_SECTIONS,
 * registerPage) can stay a plain Server Component.
 */
export function HelpAccordion({ sections }: { sections: HelpSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="mt-6 space-y-8">
      {sections.map((section) => (
        <div key={section.title}>
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
