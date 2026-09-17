"use client";

import { useState, useTransition } from "react";
import { requestCustomerDataOtpAction, verifyCustomerDataOtpAction } from "./otpActions";

const REASON_MESSAGE: Record<string, string> = {
  not_connected: "Connect your Telegram (personal chat) on the Telegram Alerts page first — the code has nowhere to send.",
  send_failed: "Couldn't reach Telegram just now — try again in a moment.",
  no_pending_code: "No code was requested, or it's already been used. Send a new one.",
  expired: "That code expired. Send a new one.",
  too_many_attempts: "Too many wrong attempts — send a new code.",
  incorrect: "That code doesn't match. Check Telegram and try again.",
};

export function CustomerDataOtpGate({ partnerId }: { partnerId: string }) {
  const [step, setStep] = useState<"idle" | "sent">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const res = await requestCustomerDataOtpAction(partnerId);
      if (!res.sent) {
        setError(REASON_MESSAGE[res.reason ?? "send_failed"]);
        return;
      }
      setStep("sent");
    });
  }

  function handleVerify() {
    setError(null);
    startTransition(async () => {
      const res = await verifyCustomerDataOtpAction(partnerId, code);
      if (!res.verified) {
        setError(REASON_MESSAGE[res.reason ?? "incorrect"]);
        return;
      }
      // revalidatePath in the action re-fetches this server component's
      // data on next navigation; a full reload guarantees it happens now.
      window.location.reload();
    });
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-border bg-bg-raised p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">🔒</div>
      <h2 className="font-display text-lg font-bold text-text">Customer data is protected</h2>
      <p className="mt-1 text-sm text-text-muted">
        This is your customers&apos; private contact information. Verify it&apos;s you via Telegram before viewing or exporting it.
      </p>

      {error && <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-sm text-red-500">{error}</div>}

      {step === "idle" ? (
        <button type="button" onClick={handleSend} disabled={isPending} className="btn-accent mt-5 disabled:opacity-50">
          Send verification code to Telegram
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-center text-lg tracking-[0.3em] text-text outline-none focus:border-accent"
          />
          <button type="button" onClick={handleVerify} disabled={isPending || code.length !== 6} className="btn-accent w-full disabled:opacity-50">
            Verify &amp; unlock
          </button>
          <button type="button" onClick={handleSend} disabled={isPending} className="text-xs text-text-muted hover:text-accent">
            Resend code
          </button>
        </div>
      )}
    </div>
  );
}
