"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, X } from "lucide-react";
import { sendSupportMessageAction, getSupportThreadAction } from "@/lib/supportTicketActions";
import type { SupportTicketRecord } from "@/lib/supportTickets";
import { SUPPORT_LANGUAGES, DEFAULT_SUPPORT_LANGUAGE, type SupportLanguage } from "@/lib/i18n/supportLanguages";

const POLL_MS = 6000;
/** Slower poll while the widget is closed — just enough to catch a new reply and show the unread badge, without polling as aggressively as the open (actively-watched) state. */
const BACKGROUND_POLL_MS = 20000;

/** Splits a message on any bare URL/relative path (from an auto-reply's link, see supportAutoReply.ts) and renders those as real clickable links — messages are plain text otherwise, so without this a link would just sit there unclickable. */
function renderMessageText(text: string) {
  const parts = text.split(/(https?:\/\/\S+|(?:^|\s)\/[a-zA-Z0-9/_#-]+)/g);
  return parts.map((part, i) => {
    const trimmed = part.trim();
    const isLink = trimmed.startsWith("http") || trimmed.startsWith("/");
    if (!isLink) return <span key={i}>{part}</span>;
    const leadingSpace = part.startsWith(" ") ? " " : "";
    return (
      <span key={i}>
        {leadingSpace}
        <a href={trimmed} target={trimmed.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="underline">
          {trimmed}
        </a>
      </span>
    );
  });
}

/**
 * One-click canned messages — sends immediately on click (same "one click,
 * no confirmation" pattern as Telecalling's send-template dropdown), so a
 * common question doesn't need typing at all. Kept short/deliberate rather
 * than exhaustive; add more here as real patterns emerge. Several of these
 * match a rule in supportAutoReply.ts, so clicking one often gets an
 * instant reply in the thread with no wait on a human.
 */
const QUICK_SHORTCUTS = [
  "I need help with billing",
  "How do I reset my password?",
  "I'd like to talk to a human",
  "Something isn't working",
];

/**
 * Fixed bottom-right "Support" bubble on every partner page. Real two-way
 * live chat, not a fire-and-forget ticket: a message sent here is pushed
 * to My Biz Flow's own ops Telegram chat within that conversation's own
 * thread, and this widget polls for replies while open — a human OR a bot
 * replying in that Telegram thread shows up here within POLL_MS, no page
 * reload needed (see src/lib/supportTickets.ts / the Telegram webhook's
 * support-ticket reply case for the full mechanism).
 *
 * Polls even while closed (slower — BACKGROUND_POLL_MS) so a reply that
 * arrives while the widget is closed shows up as a red unread-count badge
 * on the floating bubble, not just silently once reopened. Seen state
 * persists across reloads via localStorage (`anu-lastseen-<partnerId>`).
 *
 * QUICK_SHORTCUTS above the input send a canned message with one click, no
 * typing — several match a keyword rule in src/lib/supportAutoReply.ts, so
 * clicking one often gets an instant "support" reply in the thread before
 * any human is even involved (still visible to a human in the Telegram
 * thread as "Auto-reply sent," so nobody duplicates an answer already given).
 *
 * WhatsApp is a second, separate reach-out option alongside the chat: a
 * plain https://wa.me/<number> deep link to MY BIZ FLOW's own platform
 * support number (env.platformSupportWhatsappNumber — see src/lib/env.ts),
 * NOT the partner's own supportHotline (a different, partner-owned field
 * for THEIR customers). No API/SDK/webhook — just WhatsApp's standard
 * "click to chat" link, omitted entirely when unconfigured.
 */
export function SupportWidget({
  partnerId,
  whatsappNumber,
}: {
  partnerId: string;
  whatsappNumber?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<SupportTicketRecord | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [language, setLanguage] = useState<SupportLanguage>(DEFAULT_SUPPORT_LANGUAGE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenKey = `anu-lastseen-${partnerId}`;
  const languageKey = "anu-language";

  // Only picks which language an AUTO-REPLY answers in — never translates
  // what the partner types or a human's reply (see supportAutoReply.ts's
  // header). Persisted across visits, not per-partner (a person's language
  // preference doesn't change with which business they're signed into).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(languageKey);
      if (saved && SUPPORT_LANGUAGES.some((l) => l.code === saved)) setLanguage(saved as SupportLanguage);
    } catch {
      // storage unavailable — defaults to English
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectLanguage(code: SupportLanguage) {
    setLanguage(code);
    try {
      localStorage.setItem(languageKey, code);
    } catch {
      // best-effort only
    }
  }

  async function refresh() {
    try {
      const t = await getSupportThreadAction(partnerId);
      setThread(t);
    } catch {
      // best-effort — a failed poll shouldn't disrupt the open widget
    }
  }

  // Restore how many messages had already been seen as of the last visit,
  // so a reply that arrived while the tab was closed/reloaded still shows
  // as unread instead of resetting to 0 on every page load.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(lastSeenKey) ?? "0");
      if (Number.isFinite(saved)) setLastSeenCount(saved);
    } catch {
      // storage unavailable — badge just won't persist across reloads
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll always, not just while open — at a slower background rate when
  // closed, so a reply while the widget is closed still surfaces as an
  // unread badge on the bubble instead of only appearing once reopened.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, open ? POLL_MS : BACKGROUND_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Opening the widget (or the thread growing while it's already open,
  // e.g. a reply arrives mid-conversation) marks everything as seen —
  // only a reply that arrives while CLOSED should count as unread.
  useEffect(() => {
    if (!open || !thread) return;
    setLastSeenCount(thread.messages.length);
    try {
      localStorage.setItem(lastSeenKey, String(thread.messages.length));
    } catch {
      // best-effort persistence only
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, thread?.messages.length]);

  const unreadCount = !open && thread ? Math.max(0, thread.messages.length - lastSeenCount) : 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread?.messages.length]);

  function handleSend(overrideText?: string) {
    const text = (overrideText ?? draft).trim();
    if (!text) return;
    setError(null);
    const formData = new FormData();
    formData.set("message", text);
    formData.set("language", language);
    setDraft("");
    startTransition(async () => {
      try {
        await sendSupportMessageAction(partnerId, formData);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send your message. Try again.");
      }
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex w-80 flex-col overflow-hidden rounded-lg border border-border bg-bg-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display text-sm font-bold text-text">ANu</h2>
              <p className="text-[11px] text-text-muted">Your My Biz Flow assistant · usually replies within a few minutes</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Only changes which language an AUTO-REPLY answers in — the
              live chat itself (what you type, and any human reply) always
              stays as typed. See supportAutoReply.ts's header. */}
          <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
            {SUPPORT_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => selectLanguage(l.code)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  language === l.code ? "bg-accent text-white" : "text-text-muted hover:bg-bg-sunken"
                }`}
                title={`Auto-reply answers in ${l.label}`}
              >
                {l.nativeLabel}
              </button>
            ))}
          </div>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                `Hi, I need support with my My Biz Flow account (partner ${partnerId}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text hover:bg-bg-sunken"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-success" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.5 3.62 1.44 5.13L2 22l5.13-1.34a9.88 9.88 0 0 0 4.9 1.29h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.83-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-2.99 0-1.42.75-2.11 1.01-2.4.27-.29.58-.36.78-.36.2 0 .39.002.56.01.18.008.42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.77 1.27 1.65 2.05 1.14 1.02 2.1 1.34 2.4 1.49.3.15.47.13.65-.05.18-.19.75-.87.95-1.17.2-.29.4-.24.66-.15.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.7-.17 1.38z" />
              </svg>
              Message us on WhatsApp
            </a>
          )}

          <div ref={scrollRef} className="max-h-72 min-h-[140px] flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {!thread || thread.messages.length === 0 ? (
              <p className="text-center text-xs text-text-muted">Send a message and our team will reply here — no need to wait on this page.</p>
            ) : (
              thread.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "partner" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                      m.from === "partner" ? "bg-accent text-white" : "bg-bg text-text"
                    }`}
                  >
                    {renderMessageText(m.text)}
                  </div>
                </div>
              ))
            )}
          </div>

          {error && <p className="px-4 text-xs text-danger">{error}</p>}

          <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2">
            {QUICK_SHORTCUTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                disabled={isPending}
                className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] text-text-muted hover:bg-bg-sunken hover:text-text disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message…"
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
            <button type="button" onClick={() => handleSend()} disabled={isPending || !draft.trim()} className="btn-accent px-3 py-2 text-sm disabled:opacity-60">
              Send
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close ANu" : unreadCount > 0 ? `Open ANu (${unreadCount} new)` : "Open ANu"}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
