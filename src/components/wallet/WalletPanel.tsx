"use client";

import { useState } from "react";
import type { WalletBalance, WalletTransaction } from "@/lib/walletClient";

const TYPE_LABEL: Record<string, string> = {
  REFERRAL_COMMISSION: "Referral commission",
  VENDOR_SETTLEMENT: "Order settlement",
  MANUAL_ADJUSTMENT: "Adjustment",
  WITHDRAWAL: "Withdrawal",
  PARTNER_REDEMPTION: "Redemption",
  REVERSAL: "Reversal",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/**
 * Generic wallet display + withdraw form — used by both the partner
 * owner's wallet page and the telecalling agent's wallet page. Takes the
 * withdraw action as a prop so each caller supplies its own
 * owner-scoped Server Action (requireSessionPartnerId / getStaffSession
 * checked server-side, never trusted from this client component).
 */
export function WalletPanel({
  wallet,
  balance,
  transactions,
  onWithdraw,
  withdrawalsEnabled = true,
}: {
  wallet: { status: "ACTIVE" | "FROZEN" | "CLOSED"; withdrawable: boolean; frozenReason: string | null } | null;
  balance: WalletBalance;
  transactions: WalletTransaction[];
  onWithdraw: (amount: number) => Promise<{ ok: boolean; error?: string }>;
  /** Phase flag (FEATURE_WALLET_WITHDRAWAL) — balances still accrue and show when this is off, only the request form is hidden. */
  withdrawalsEnabled?: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const frozen = wallet?.status === "FROZEN";
  const withdrawable = wallet?.withdrawable !== false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await onWithdraw(value);
      if (!res.ok) {
        setError(res.error || "Couldn't submit the withdrawal request.");
      } else {
        setSuccess("Withdrawal requested — it'll be reviewed and paid out via bank transfer.");
        setAmount("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {frozen && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your wallet is currently frozen{wallet?.frozenReason ? `: ${wallet.frozenReason}` : "."} Contact support if
          this looks wrong.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Available</div>
          <div className="mt-1 text-xl font-bold text-text">₹{balance.available}</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pending settlement</div>
          <div className="mt-1 text-xl font-bold text-text">₹{balance.pending}</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Reserved</div>
          <div className="mt-1 text-xl font-bold text-text">₹{balance.held}</div>
        </div>
      </div>

      {withdrawable && withdrawalsEnabled && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-bg-raised p-4">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Request withdrawal</h3>
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {success && <p className="mb-2 text-sm text-emerald-700">{success}</p>}
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting || frozen}
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitting || frozen}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Request withdrawal"}
            </button>
          </div>
        </form>
      )}
      {withdrawable && !withdrawalsEnabled && (
        <p className="text-sm text-text-muted">Withdrawals aren't open yet — your balance keeps accruing until then.</p>
      )}

      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Statement</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-text-muted">No transactions yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text-muted">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-2 text-text">{TYPE_LABEL[t.type] || t.type}</td>
                    <td className="px-4 py-2 text-text-muted">{t.reason || "—"}</td>
                    <td className="px-4 py-2 text-text-muted">{t.status}</td>
                    <td
                      className={`px-4 py-2 text-right font-semibold ${
                        t.direction === "CREDIT" ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {t.direction === "CREDIT" ? "+" : "-"}₹{t.amount.replace("-", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
