"use client";

import { useState } from "react";
import { requestUnifiedWhatsAppOtpAction, verifyUnifiedWhatsAppOtpAction } from "./actions";

export function UnifiedWhatsAppOtpForm({ role }: { role: "business" | "customer" | "provider" }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const label = role === "business" ? "Business / Staff" : role === "customer" ? "Customer" : "Service Provider";
  async function send() {
    setPending(true); setError("");
    const result = await requestUnifiedWhatsAppOtpAction(role, phone);
    setPending(false);
    if (!result.ok) { setError(result.error ?? "Unable to send OTP."); return; }
    setStep("code");
  }
  async function verify() {
    setPending(true); setError("");
    const result = await verifyUnifiedWhatsAppOtpAction(role, phone, code);
    setPending(false);
    if (result?.error) setError(result.error);
  }
  return <div className="flex flex-col gap-3">
    <p className="text-sm text-text-muted">Sign in as {label} using only your registered WhatsApp number.</p>
    {error && <p className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
    {step === "phone" ? <>
      <label className="text-sm font-medium text-text">Registered WhatsApp number<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" autoComplete="tel" className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" /></label>
      <button type="button" disabled={pending || !phone.trim()} onClick={send} className="btn-accent w-full disabled:opacity-60">{pending ? "Sending..." : "Send OTP on WhatsApp"}</button>
    </> : <>
      <p className="text-sm text-text-muted">OTP sent to <b className="text-text">{phone}</b>.</p>
      <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit OTP" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-center text-lg tracking-widest text-text" />
      <button type="button" disabled={pending || code.length !== 6} onClick={verify} className="btn-accent w-full disabled:opacity-60">{pending ? "Verifying..." : "Verify & Sign in"}</button>
      <button type="button" onClick={() => { setStep("phone"); setCode(""); }} className="text-xs font-semibold text-teal hover:underline">Use a different number</button>
    </>}
  </div>;
}
