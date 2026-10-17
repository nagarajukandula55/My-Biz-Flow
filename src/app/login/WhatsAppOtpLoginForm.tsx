"use client";

import { useState } from "react";
import { requestPartnerWhatsAppOtpAction, verifyPartnerWhatsAppOtpAction } from "./actions";

/**
 * Two-step "Login with WhatsApp OTP" — a second method alongside the
 * password form on the same page (see page.tsx), not a replacement for it.
 * Calls the server actions directly (not via a <form action>) since the
 * step transition (phone -> code entry) needs to happen client-side
 * between the two calls.
 */
export function WhatsAppOtpLoginForm() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function requestCode() {
    setError(undefined);
    setPending(true);
    const result = await requestPartnerWhatsAppOtpAction(phone);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't send the code — please try again.");
      return;
    }
    setStep("code");
  }

  async function verifyCode() {
    setError(undefined);
    setPending(true);
    const result = await verifyPartnerWhatsAppOtpAction(phone, code);
    // On success this redirects server-side and never returns here — only
    // an error result reaches this line.
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {step === "phone" ? (
        <>
          <label className="text-sm font-medium text-text">
            Registered WhatsApp Number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98xxxxxxxx"
              required
              autoComplete="tel"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <button
            type="button"
            disabled={pending || !phone.trim()}
            onClick={requestCode}
            className="btn-accent w-full disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send code on WhatsApp"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted">
            We've sent a code on WhatsApp to <span className="font-semibold text-text">{phone}</span>.
          </p>
          <label className="text-sm font-medium text-text">
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-center text-lg tracking-widest text-text outline-none focus:border-teal"
            />
          </label>
          <button
            type="button"
            disabled={pending || code.trim().length !== 6}
            onClick={verifyCode}
            className="btn-accent w-full disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Verify & Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(undefined);
            }}
            className="text-xs font-semibold text-teal hover:underline"
          >
            Use a different number
          </button>
        </>
      )}
    </div>
  );
}
