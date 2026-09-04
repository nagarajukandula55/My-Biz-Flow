"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { clearAllPartnerData } from "./actions";

/**
 * Danger-zone action for the live demo: deletes every Partner and its
 * business data ONLY — never platform configuration (Designer
 * customizations, document templates, numbering, page-access, error log),
 * which is the system being built out for every future partner and must
 * survive this untouched. See actions.ts — currently a no-op since there
 * is no persisted partner/business data yet.
 */
export function ResetDemoDataButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<number | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const { deletedPartners } = await clearAllPartnerData();
      setOpen(false);
      setResult(deletedPartners);
    });
  }

  return (
    <>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Clear All Partner Data
      </button>
      {result !== null && (
        <span className="ml-3 text-sm font-semibold text-success">
          {result === 0
            ? "No persisted partner data yet — nothing to clear (see actions.ts)."
            : `${result} partner(s) and their data deleted.`}
        </span>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Clear All Partner Data"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleConfirm} disabled={pending}>
              {pending ? "Clearing…" : "Delete Every Partner"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Permanently deletes every partner account and the business data scoped to it (workorders,
          invoices, inventory, appointments, etc.) — for clearing out demo/test signups before going live
          for real. Platform configuration (Designer, templates, numbering, page access) is never touched.
          This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
