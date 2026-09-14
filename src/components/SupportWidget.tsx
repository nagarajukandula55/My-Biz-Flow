"use client";

import { useRef, useState, useTransition } from "react";
import { MessageCircle, X } from "lucide-react";
import { submitSupportTicketAction } from "@/lib/supportTicketActions";

/**
 * Fixed bottom-right "Support" bubble on every partner page (matches
 * AN-CRM's ContactWidget.tsx placement — see that file's floating button).
 * Unlike AN-CRM's widget (which relays to Telegram/WhatsApp), this is a
 * genuine human support-ticket submission: the message is persisted via
 * submitSupportTicketAction into a BusinessRecord ("support-tickets" module,
 * see src/lib/supportTickets.ts) for a Super Admin to review/resolve from
 * /admin/support-tickets. No AI/bot reply of any kind — just storage.
 *
 * WhatsApp is a second, non-persisted reach-out option alongside the ticket
 * form: a plain https://wa.me/<number> deep link to MY BIZ FLOW's own
 * platform support number (env.platformSupportWhatsappNumber — see
 * src/lib/env.ts), NOT the partner's own supportHotline (that's a
 * partner-owned field printed on their documents, for THEIR customers to
 * call — a different audience entirely). This is the partner reaching the
 * platform for help, same audience as the ticket form. No API/SDK/webhook —
 * just WhatsApp's standard "click to chat" link. The number is passed in
 * from the server (env vars aren't readable client-side) and the button is
 * omitted entirely when it isn't configured.
 */
export function SupportWidget({
  partnerId,
  whatsappNumber,
}: {
  partnerId: string;
  whatsappNumber?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await submitSupportTicketAction(partnerId, formData);
        setSent(true);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send your message. Try again.");
      }
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 rounded-lg border border-border bg-bg-raised p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-text">Contact Support</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                `Hi, I need support with my My Biz Flow account (partner ${partnerId}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex items-center justify-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-semibold text-text hover:bg-bg-sunken"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-success" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.5 3.62 1.44 5.13L2 22l5.13-1.34a9.88 9.88 0 0 0 4.9 1.29h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.83-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-2.99 0-1.42.75-2.11 1.01-2.4.27-.29.58-.36.78-.36.2 0 .39.002.56.01.18.008.42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.77 1.27 1.65 2.05 1.14 1.02 2.1 1.34 2.4 1.49.3.15.47.13.65-.05.18-.19.75-.87.95-1.17.2-.29.4-.24.66-.15.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.7-.17 1.38z" />
              </svg>
              Message us on WhatsApp
            </a>
          )}

          {sent ? (
            <div className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
              Message sent — our team will get back to you.
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-2 block text-xs font-semibold text-accent hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form ref={formRef} action={handleSubmit} className="space-y-2">
              <textarea
                name="message"
                required
                rows={4}
                placeholder="How can we help?"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <button type="submit" disabled={isPending} className="btn-accent w-full text-sm disabled:opacity-60">
                {isPending ? "Sending…" : "Send"}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support" : "Open support"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
