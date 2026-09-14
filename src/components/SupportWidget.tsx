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
 */
export function SupportWidget({ partnerId }: { partnerId: string }) {
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
