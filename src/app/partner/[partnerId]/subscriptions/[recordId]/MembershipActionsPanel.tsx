"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { StatusChip } from "@/components/StatusChip";
import type { Membership } from "@/lib/sample-data/subscriptions";
import { checkInAction, freezeMembershipAction, recordPaymentAction, resumeMembershipAction } from "../actions";

export function MembershipActionsPanel({ partnerId, membership }: { partnerId: string; membership: Membership }) {
  const router = useRouter();
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [resumeDate, setResumeDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  const isActive = membership.status === "Active";
  const isPaused = membership.status === "Paused";
  const recentCheckIns = [...membership.checkIns].reverse().slice(0, 10);

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Billing</h2>
          <StatusChip
            label={membership.status}
            variant={isActive ? "success" : isPaused ? "warning" : membership.status === "Expired" ? "danger" : "neutral"}
          />
        </div>
        <div className="mt-3 space-y-1 text-sm text-text-muted">
          <div className="flex justify-between">
            <span>Billing cycle</span>
            <span className="text-text">{membership.billingCycle}</span>
          </div>
          <div className="flex justify-between">
            <span>Cycle amount</span>
            <span className="tabular-nums text-text">₹{membership.planAmount}</span>
          </div>
          <div className="flex justify-between">
            <span>Next billing date</span>
            <span className="text-text">{membership.nextBillingDate ?? "—"}</span>
          </div>
          {isPaused && (
            <div className="flex justify-between">
              <span>Resume date</span>
              <span className="text-text">{membership.resumeDate ?? "—"}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-accent disabled:opacity-50"
            disabled={!isActive || isPending}
            onClick={() => run(() => recordPaymentAction(partnerId, membership.id))}
          >
            Record Payment
          </button>
          {isActive && (
            <button type="button" className="btn-outline" disabled={isPending} onClick={() => setFreezeOpen(true)}>
              Freeze Membership
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              className="btn-outline"
              disabled={isPending}
              onClick={() => run(() => resumeMembershipAction(partnerId, membership.id))}
            >
              Resume
            </button>
          )}
          <button
            type="button"
            className="btn-outline disabled:opacity-50"
            disabled={!isActive || isPending}
            onClick={() => run(() => checkInAction(partnerId, membership.id))}
          >
            Check In
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Recent Check-ins</h2>
        {recentCheckIns.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No check-ins logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
            {recentCheckIns.map((c, i) => (
              <li key={i} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                <span className="text-text">{new Date(c.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-text-muted">{membership.checkIns.length} total check-in{membership.checkIns.length === 1 ? "" : "s"}</p>
      </div>

      <Modal
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        title="Freeze Membership"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setFreezeOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-accent"
              disabled={isPending}
              onClick={() => {
                run(() => freezeMembershipAction(partnerId, membership.id, resumeDate || undefined));
                setFreezeOpen(false);
              }}
            >
              Freeze
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Billing stops tracking until Resume is called. Optionally set a planned resume date.
        </p>
        <input
          type="date"
          value={resumeDate}
          onChange={(e) => setResumeDate(e.target.value)}
          className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </Modal>
    </div>
  );
}
