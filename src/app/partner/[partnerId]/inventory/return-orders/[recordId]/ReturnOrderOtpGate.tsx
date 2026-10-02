"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { requestReturnOrderCloseOtpAction } from "../actions";

const REASON_MESSAGE: Record<string, string> = {
  not_connected: "Connect the Owner's personal Telegram chat on the Telegram Alerts page first — the code has nowhere to send.",
  send_failed: "Couldn't reach Telegram just now — try again in a moment.",
  no_pending_code: "No code was requested, or it's already been used. Send a new one.",
  expired: "That code expired. Send a new one.",
  incorrect: "That code doesn't match. Check Telegram and try again.",
};

/**
 * Telegram-OTP confirm gate for a Return Order's stock-moving terminal
 * transition (Warehouse Inward / Dispatch) — same mandatory
 * confirm-before-moving-stock pattern as StockTransferReconcileGate /
 * StockTakeReconcileGate. `onVerify` is the actual server action
 * (warehouseInwardReturnOrderAction or dispatchReturnOrderAction), called
 * with the entered code only once a fresh OTP has been requested.
 */
export function ReturnOrderOtpGate({
  partnerId,
  recordId,
  recordLabel,
  buttonLabel,
  modalTitle,
  onVerify,
  onSuccess,
}: {
  partnerId: string;
  recordId: string;
  recordLabel: string;
  buttonLabel: string;
  modalTitle: string;
  onVerify: (code: string) => Promise<void | { error?: string }>;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "sent">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setOpen(true);
    setStep("idle");
    setCode("");
    setError(null);
  }

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const res = await requestReturnOrderCloseOtpAction(partnerId, recordId, recordLabel);
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
      const result = await onVerify(code);
      if (result && "error" in result && result.error) {
        const err = result.error;
        if (err.startsWith("otp:")) {
          setError(REASON_MESSAGE[err.slice(4)] ?? REASON_MESSAGE.incorrect);
          return;
        }
        setError(err);
        return;
      }
      setOpen(false);
      onSuccess();
    });
  }

  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        {buttonLabel}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={modalTitle}>
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">
            This moves real Stock — Owner&apos;s approval is required. Enter the code sent to their Telegram.
          </p>
          {error && <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-sm text-red-500">{error}</div>}
          {step === "idle" ? (
            <button type="button" onClick={handleSend} disabled={isPending} className="btn-accent w-full disabled:opacity-50">
              Send OTP to Owner&apos;s Telegram
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-center text-lg tracking-[0.3em] text-text outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={isPending || code.length !== 6}
                className="btn-accent w-full disabled:opacity-50"
              >
                Verify &amp; confirm
              </button>
              <button type="button" onClick={handleSend} disabled={isPending} className="text-xs text-text-muted hover:text-accent">
                Resend code
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
