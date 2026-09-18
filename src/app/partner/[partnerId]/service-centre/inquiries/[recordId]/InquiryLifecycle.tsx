"use client";

import { useState, useTransition } from "react";
import type { Row } from "@/components/DataTable";
import { StatusChip } from "@/components/StatusChip";
import { closeInquiryAction, convertInquiryToWorkorderAction } from "../actions";
import { INQUIRY_CLOSE_REASONS, INQUIRY_STATUS_VARIANT } from "@/lib/sample-data/service-centre-inquiry";

/**
 * Open -> Converted | Closed. Same shape as ClinicLifecycle.tsx: a status
 * chip, an action panel above the read-only detail grid, useTransition for
 * optimistic UI, and a small modal for the one action that needs input
 * (Close's reason). Converting redirects to the new workorder on success
 * (see convertInquiryToWorkorderAction), so there's no local "converted"
 * state to hold — only the error and the close-reason modal are local.
 */
export function InquiryLifecycle({
  partnerId,
  inquiryId,
  record,
}: {
  partnerId: string;
  inquiryId: string;
  record: Row;
}) {
  const status = String(record["status"] ?? "Open");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  function convert() {
    setError(null);
    startTransition(async () => {
      const result = await convertInquiryToWorkorderAction(partnerId, inquiryId);
      if (result?.error) setError(result.error);
    });
  }

  function submitClose() {
    if (!closeReason) {
      setError("Select a close reason");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("closeReason", closeReason);
    startTransition(async () => {
      const result = await closeInquiryAction(partnerId, inquiryId, formData);
      if (result?.error) setError(result.error);
      else setCloseModalOpen(false);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</span>
          <StatusChip label={status} variant={INQUIRY_STATUS_VARIANT[status] ?? "neutral"} />
        </div>

        {status === "Open" && (
          <div className="flex items-center gap-2">
            <button type="button" className="btn-outline" disabled={isPending} onClick={() => setCloseModalOpen(true)}>
              Close
            </button>
            <button type="button" className="btn-accent" disabled={isPending} onClick={convert}>
              Convert to Workorder
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-5">
            <h3 className="font-display text-base font-bold text-text">Close Inquiry</h3>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Reason
              <select
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
              >
                <option value="">Select a reason</option>
                {INQUIRY_CLOSE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setCloseModalOpen(false)} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn-accent" onClick={submitClose} disabled={isPending}>
                Close Inquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
