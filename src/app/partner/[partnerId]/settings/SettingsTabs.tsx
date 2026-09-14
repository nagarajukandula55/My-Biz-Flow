"use client";

import { useState, type ReactNode } from "react";

/**
 * Real tab switcher for the four persisted Settings sections — only one
 * panel is visible at a time, switched by clicking a tab, rather than the
 * previous "everything visible on one long scroll with a jump-nav"
 * layout. Plain client state, no new library.
 *
 * The panels below are Server Components rendered by settings/page.tsx
 * (they read/write real Partner fields via Server Actions) and are passed
 * in as `children` already-rendered — a Client Component cannot read
 * their internals or thread state down as props (Server Components render
 * once, ahead of any client interaction). So visibility here is driven by
 * CSS, not conditional mounting: this component stamps the active tab id
 * onto a wrapper `data-settings-tab` attribute, and a handful of attribute-
 * selector rules (declared once, right here) show only the matching
 * panel(s). Business Profile and Bank Details are two panels within the
 * SAME underlying <form> (see BusinessProfileForm.tsx) — they must stay
 * one form/one Server Action, since a second, split action would blank
 * whichever half of the record wasn't included in that particular submit
 * (the exact "field wiped on reload" class of bug this app has already
 * had to fix once). Toggling their visibility via ids inside that one
 * form, rather than splitting it into two forms, keeps that safe.
 */
const TABS = [
  { id: "business-profile", label: "Business Profile" },
  { id: "bank-details", label: "Bank Details" },
  { id: "config", label: "Config" },
  { id: "numbering", label: "Numbering" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsTabs({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<TabId>("business-profile");

  return (
    <div className="mt-6">
      <style>{`
        #settings-panel-business, #settings-panel-config, #settings-panel-numbering { display: none; }
        #settings-heading-business-profile, #settings-heading-bank-details,
        #settings-fields-business-profile, #settings-fields-bank-details { display: none; }
        [data-settings-tab="business-profile"] #settings-panel-business { display: block; }
        [data-settings-tab="business-profile"] #settings-heading-business-profile { display: block; }
        [data-settings-tab="business-profile"] #settings-fields-business-profile { display: contents; }
        [data-settings-tab="bank-details"] #settings-panel-business { display: block; }
        [data-settings-tab="bank-details"] #settings-heading-bank-details { display: block; }
        [data-settings-tab="bank-details"] #settings-fields-bank-details { display: contents; }
        [data-settings-tab="config"] #settings-panel-config { display: block; }
        [data-settings-tab="numbering"] #settings-panel-numbering { display: block; }
      `}</style>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            aria-pressed={active === tab.id}
            className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active === tab.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg-raised text-text hover:border-accent hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div data-settings-tab={active}>{children}</div>
    </div>
  );
}
