"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import type { AccessScope, BrandRollup } from "@/lib/sample-data/brand";
import { setUserAccessScopeAction } from "./actions";

export function BrandLifecycle({
  partnerId,
  brandRecordId,
  brandName,
  rollup,
  users,
}: {
  partnerId: string;
  brandRecordId: string;
  brandName: string;
  rollup: BrandRollup;
  users: { id: string; accessScope: AccessScope }[];
}) {
  const [scopes, setScopes] = useState<Record<string, AccessScope>>(
    Object.fromEntries(users.map((u) => [u.id, u.accessScope]))
  );
  const [, startPersist] = useTransition();

  function toggleScope(userId: string) {
    const next: AccessScope = scopes[userId] === "brand-wide" ? "single-location" : "brand-wide";
    setScopes((prev) => ({ ...prev, [userId]: next }));
    startPersist(async () => {
      await setUserAccessScopeAction(partnerId, userId, next, brandRecordId);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">{brandName} — Locations Rollup</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Locations</div>
            <div className="mt-0.5 text-xl font-bold text-text">{rollup.locationCount}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Monthly Revenue</div>
            <div className="mt-0.5 text-xl font-bold text-text">₹{rollup.totalMonthlyRevenue}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status Breakdown</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(rollup.statusBreakdown).map(([status, count]) => (
                <StatusChip key={status} label={`${status}: ${count}`} variant="neutral" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Cross-Location Role Assignment</h2>
        <p className="mt-1 text-sm text-text-muted">
          Mark which of this partner&apos;s team members have access across every location under this brand vs a single location.
        </p>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No users found for this partner.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <span className="font-semibold text-text">{u.id}</span>
                <div className="flex items-center gap-2">
                  <StatusChip
                    label={scopes[u.id] === "brand-wide" ? "Brand-wide" : "Single-location"}
                    variant={scopes[u.id] === "brand-wide" ? "teal" : "neutral"}
                  />
                  <button type="button" className="btn-outline text-xs" onClick={() => toggleScope(u.id)}>
                    Switch to {scopes[u.id] === "brand-wide" ? "Single-location" : "Brand-wide"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
