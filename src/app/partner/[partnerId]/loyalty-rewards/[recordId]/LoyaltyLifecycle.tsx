"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { computeTier, EARN_RATE, type LoyaltyTierName, type LoyaltyTransaction } from "@/lib/sample-data/loyalty-rewards";
import { earnPointsAction, redeemPointsAction } from "./actions";

const TIER_VARIANT: Record<LoyaltyTierName, "neutral" | "amber" | "teal"> = {
  Silver: "neutral",
  Gold: "amber",
  Platinum: "teal",
};

export function LoyaltyLifecycle({
  partnerId,
  loyaltyId,
  initialPointsBalance,
  initialLifetimePointsEarned,
  initialTransactions,
}: {
  partnerId: string;
  loyaltyId: string;
  initialPointsBalance: number;
  initialLifetimePointsEarned: number;
  initialTransactions: LoyaltyTransaction[];
}) {
  const [pointsBalance, setPointsBalance] = useState(initialPointsBalance);
  const [lifetimePointsEarned, setLifetimePointsEarned] = useState(initialLifetimePointsEarned);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [earnOpen, setEarnOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startPersist] = useTransition();

  const tier = computeTier(lifetimePointsEarned);

  function submitEarn() {
    const parsed = Number(amount);
    setError(null);
    startPersist(async () => {
      const result = await earnPointsAction(partnerId, loyaltyId, parsed);
      if (result.error) {
        setError(result.error);
        return;
      }
      const points = Math.round(parsed * EARN_RATE);
      setPointsBalance((b) => b + points);
      setLifetimePointsEarned((l) => l + points);
      setTransactions((prev) => [...prev, { id: `LT-${Date.now()}`, type: "Earn", points, amount: parsed, timestamp: new Date().toISOString() }]);
      setEarnOpen(false);
      setAmount("");
    });
  }

  function submitRedeem() {
    const parsed = Number(redeemPoints);
    setError(null);
    if (parsed > pointsBalance) {
      setError(`Insufficient points balance (${pointsBalance} available, ${parsed} requested).`);
      return;
    }
    startPersist(async () => {
      const result = await redeemPointsAction(partnerId, loyaltyId, parsed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPointsBalance((b) => b - parsed);
      setTransactions((prev) => [...prev, { id: `LT-${Date.now()}`, type: "Redeem", points: parsed, timestamp: new Date().toISOString() }]);
      setRedeemOpen(false);
      setRedeemPoints("");
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Points Balance</div>
              <div className="mt-0.5 text-xl font-bold text-text">{pointsBalance}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Lifetime Earned</div>
              <div className="mt-0.5 text-text">{lifetimePointsEarned}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Tier</div>
              <StatusChip label={tier} variant={TIER_VARIANT[tier]} className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-accent" onClick={() => setEarnOpen(true)}>
              Add Purchase (Earn Points)
            </button>
            <button type="button" className="btn-outline" onClick={() => setRedeemOpen(true)}>
              Redeem Points
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Tiers: Silver 0–999, Gold 1,000–4,999, Platinum 5,000+ lifetime points earned. Points earn at {EARN_RATE * 100}% of purchase amount.
        </p>
        {error && (
          <div className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
        )}
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No points transactions yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {transactions
              .slice()
              .reverse()
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <div>
                    <StatusChip label={t.type} variant={t.type === "Earn" ? "success" : "warning"} />
                    {t.amount !== undefined && <span className="ml-2 text-xs text-text-muted">on ₹{t.amount} purchase</span>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-text">{t.type === "Earn" ? "+" : "-"}{t.points} pts</div>
                    <div className="text-xs text-text-muted">{new Date(t.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <Modal
        open={earnOpen}
        onClose={() => setEarnOpen(false)}
        title="Add Purchase (Earn Points)"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setEarnOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitEarn}>
              Add
            </button>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Purchase Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          {amount && Number(amount) > 0 && (
            <p className="mt-2 text-xs text-text-muted">Will earn {Math.round(Number(amount) * EARN_RATE)} points.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        title="Redeem Points"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setRedeemOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitRedeem}>
              Redeem
            </button>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Points to Redeem</label>
          <input
            type="number"
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <p className="mt-2 text-xs text-text-muted">Available: {pointsBalance} points.</p>
        </div>
      </Modal>
    </div>
  );
}
