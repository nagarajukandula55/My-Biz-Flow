"use client";

import { useState } from "react";
import { requestCustomerWhatsAppOtpAction, verifyCustomerWhatsAppOtpAction } from "@/lib/fieldForce/actions";

/**
 * Two-step "Login with WhatsApp OTP" for a Field Force customer — a second
 * method alongside the phone+password form on the same page, not a
 * replacement for it. Same client-side step-transition shape as the
 * partner-side src/app/login/WhatsAppOtpLoginForm.tsx.
 */
export function WhatsAppOtpLoginForm({ partnerId }: { partnerId: string }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function requestCode() {
    setError(undefined);
    setPending(true);
    const result = await requestCustomerWhatsAppOtpAction(partnerId, phone);
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
    const result = await verifyCustomerWhatsAppOtpAction(partnerId, phone, code);
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
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Registered WhatsApp number"
            required
            autoComplete="tel"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
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
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
            placeholder="6-digit code"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-center text-lg tracking-widest text-text"
          />
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
