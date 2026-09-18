"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

/**
 * Public-site (anonymous visitor) version of the "ANu" help bubble —
 * distinct from SupportWidget.tsx, which is a real, stateful, partner-
 * scoped two-way chat backed by a support-tickets BusinessRecord. An
 * anonymous homepage visitor has no partnerId, so there's no tenant to
 * scope a real chat thread to (and no single ops Telegram thread makes
 * sense for "any visitor, possibly not even a customer yet") — see the
 * doc comment on the QUICK_LINKS below for what a real public chat would
 * actually need before it could exist.
 *
 * What this IS: a small teaser popup ("Need help? Chat with ANu") that
 * appears once per visit, plus a panel of one-click links to the real
 * public self-serve pages that already exist (Track My Repair, Book
 * Appointment, FAQ, Contact) — genuinely useful today, zero new backend.
 */
const QUICK_LINKS: { label: string; href: string; description: string }[] = [
  { label: "Track My Repair", href: "/track", description: "Check your workorder/repair status" },
  { label: "Book an Appointment", href: "/book-appointment", description: "Request a service visit or drop-off" },
  { label: "Help & FAQ", href: "/help", description: "Common questions about My Biz Flow" },
  { label: "Contact Us", href: "/contact", description: "Reach our team directly" },
];

export function PublicHelpBubble() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);

  useEffect(() => {
    // Once per visit (sessionStorage, not localStorage — a returning
    // visitor next session sees it again, but not on every page nav within
    // the same visit). Wrapped in try/catch per this app's own convention
    // for browser-storage access (private windows/blocked storage throw).
    let seen = false;
    try {
      seen = sessionStorage.getItem("anu-teaser-seen") === "1";
    } catch {
      // storage unavailable — treat as not-yet-seen, just don't persist it
    }
    if (seen) return;
    const timer = setTimeout(() => {
      setShowTeaser(true);
      try {
        sessionStorage.setItem("anu-teaser-seen", "1");
      } catch {
        // best-effort only
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {showTeaser && !open && (
        <div className="mb-3 flex max-w-[220px] items-start gap-2 rounded-lg border border-border bg-bg-raised p-3 text-sm text-text shadow-lg">
          <span className="flex-1">
            👋 Need help? Chat with <strong>ANu</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowTeaser(false)}
            aria-label="Dismiss"
            className="text-text-muted hover:text-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {open && (
        <div className="mb-3 flex w-72 flex-col overflow-hidden rounded-lg border border-border bg-bg-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display text-sm font-bold text-text">ANu</h2>
              <p className="text-[11px] text-text-muted">Quick links to get you sorted fast</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1 p-3">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm hover:bg-bg-sunken"
              >
                <div className="font-semibold text-text">{link.label}</div>
                <div className="text-xs text-text-muted">{link.description}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setShowTeaser(false);
        }}
        aria-label={open ? "Close ANu" : "Open ANu"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
