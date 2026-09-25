"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { LEGAL_MATTER_STATUSES, type LegalMatterStatus } from "@/lib/legal";
import { setLegalMatterStatusAction } from "./actions";

const STATUS_VARIANT: Record<LegalMatterStatus, "neutral" | "warning" | "teal" | "success" | "amber"> = {
  Open: "teal",
  InProgress: "warning",
  OnHold: "amber",
  Closed: "success",
};

/**
 * Matter status control — replaced the earlier MATTER_STAGES stepper
 * (New/Discovery/Filing/Hearing/Resolved) plus its billable-hours logging
 * and auto-invoice-on-Resolved behavior, none of which map onto
 * LegalMatter's real columns (there is no timeLog/hourlyRate/invoiceId on
 * this model). Status here is the real Open/InProgress/OnHold/Closed enum
 * (prisma/schema.prisma's LegalMatter.status); changing it fires the
 * "legalMatterStatusChanged" Telegram alert server-side (see
 * updateLegalMatter in src/lib/legal.ts).
 */
export function MatterLifecycle({
  partnerId,
  matterId,
  initialStatus,
}: {
  partnerId: string;
  matterId: string;
  initialStatus: LegalMatterStatus;
}) {
  const [status, setStatus] = useState<LegalMatterStatus>(initialStatus);
  const [, startTransition] = useTransition();

  function changeStatus(next: LegalMatterStatus) {
    if (next === status) return;
    setStatus(next);
    startTransition(async () => {
      await setLegalMatterStatusAction(partnerId, matterId, next);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</span>
          <StatusChip label={status} variant={STATUS_VARIANT[status]} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LEGAL_MATTER_STATUSES.filter((s) => s !== status).map((s) => (
            <button key={s} type="button" className="btn-outline" onClick={() => changeStatus(s)}>
              Move to {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
