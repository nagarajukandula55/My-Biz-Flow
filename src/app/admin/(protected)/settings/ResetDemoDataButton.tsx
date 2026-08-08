"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { clearAllVendorData } from "./actions";

/**
 * Danger-zone action for the live demo: deletes every Vendor and its
 * business data ONLY — never platform configuration (Designer
 * customizations, document templates, numbering, page-access, error log),
 * which is the system being built out for every future vendor and must
 * survive this untouched. See actions.ts — currently a no-op since there
 * is no persisted vendor/business data yet.
 */
export function ResetDemoDataButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<number | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const { deletedVendors } = await clearAllVendorData();
      setOpen(false);
      setResult(deletedVendors);
    });
  }

  return (
    <>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Clear All Vendor Data
      </button>
      {result !== null && (
        <span className="ml-3 text-sm font-semibold text-success">
          {result === 0
            ? "No persisted vendor data yet — nothing to clear (see actions.ts)."
            : `${result} vendor(s) and their data deleted.`}
        </span>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Clear All Vendor Data"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleConfirm} disabled={pending}>
              {pending ? "Clearing…" : "Delete Every Vendor"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Permanently deletes every vendor account and the business data scoped to it (workorders,
          invoices, inventory, appointments, etc.) — for clearing out demo/test signups before going live
          for real. Platform configuration (Designer, templates, numbering, page access) is never touched.
          This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
