"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { requestStockTransferCloseOtpAction, verifyAndCloseStockTransferAction } from "../actions";

const REASON_MESSAGE: Record<string, string> = {
  not_connected: "Connect the Owner's personal Telegram chat on the Telegram Alerts page first — the code has nowhere to send.",
  send_failed: "Couldn't reach Telegram just now — try again in a moment.",
  no_pending_code: "No code was requested, or it's already been used. Send a new one.",
  expired: "That code expired. Send a new one.",
  too_many_attempts: "Too many wrong attempts — send a new code.",
  incorrect: "That code doesn't match. Check Telegram and try again.",
};

/**
 * Gate for closing (moving stock for) a Pending own-warehouse Stock
 * Transfer — same Telegram-OTP pattern as ReopenWorkorderGate
 * (service-centre/[recordId]/ReopenWorkorderGate.tsx) and
 * StockTakeReconcileGate. Requires a fresh code, sent to the Owner's
 * connected personal Telegram chat, before verifyAndCloseStockTransferAction
 * (actions.ts) will actually draw the source warehouse down and receive the
 * destination warehouse.
 */
export function StockTransferReconcileGate({
  partnerId,
  recordId,
  recordLabel,
}: {
  partnerId: string;
  recordId: string;
  recordLabel: string;
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
      const res = await requestStockTransferCloseOtpAction(partnerId, recordId, recordLabel);
      if (!res.sent) {
        setError(REASON_MESSAGE[res.reason ?? "send_failed"]);
        return;
      }
      setStep("sent");
    });
  }

  function handleVerifyAndClose() {
    setError(null);
    startTransition(async () => {
      const res = await verifyAndCloseStockTransferAction(partnerId, recordId, code);
      if (!res.verified) {
        setError(REASON_MESSAGE[res.reason ?? "incorrect"]);
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <>
      <button type="button" onClick={openModal} className="btn-accent">
        Reconcile / Confirm
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm Stock Transfer">
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">
            Confirming moves real Stock between warehouses — Owner&apos;s approval is required. Enter the code sent to
            their Telegram.
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
                onClick={handleVerifyAndClose}
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
