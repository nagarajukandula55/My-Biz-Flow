"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { completeClinicAppointmentAction, createInvoiceFromAppointmentAction } from "./actions";

/**
 * Consultation completion + billing panel shown above the read-only
 * RecordDetail grid — mirrors WorkorderLifecycle's "capture something at
 * completion, then let staff invoice from it" shape, scoped to the
 * clinic module's own fields (prescription notes, consultation fee).
 */
export function ClinicLifecycle({
  partnerId,
  recordId,
  initialStatus,
  initialPrescriptionNotes,
  invoiceId,
}: {
  partnerId: string;
  recordId: string;
  initialStatus: string;
  initialPrescriptionNotes?: string;
  invoiceId?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [prescriptionNotes, setPrescriptionNotes] = useState(initialPrescriptionNotes ?? "");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [invoice, setInvoice] = useState(invoiceId);
  const [, startPersist] = useTransition();

  function submitCompletion() {
    setStatus("Completed");
    setCompleteOpen(false);
    startPersist(async () => {
      await completeClinicAppointmentAction(partnerId, recordId, prescriptionNotes);
    });
  }

  function createInvoice() {
    startPersist(async () => {
      await createInvoiceFromAppointmentAction(partnerId, recordId);
      setInvoice("pending"); // optimistic; page revalidation fills in the real id on next load
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</span>
          <StatusChip
            label={status}
            variant={status === "Completed" ? "success" : status === "Cancelled" || status === "No-show" ? "danger" : "teal"}
          />
        </div>
        <div className="flex items-center gap-3">
          {status !== "Completed" && status !== "Cancelled" && (
            <button type="button" className="btn-accent" onClick={() => setCompleteOpen(true)}>
              Mark Completed
            </button>
          )}
          {status === "Completed" && !invoice && (
            <button type="button" className="btn-outline" onClick={createInvoice}>
              Create Invoice
            </button>
          )}
          {status === "Completed" && invoice && (
            <Link href={`/partner/${partnerId}/billing/${invoice}`} className="btn-outline">
              Sales Invoice
            </Link>
          )}
        </div>
      </div>

      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete Consultation"
        size="md"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitCompletion}>
              Mark Completed
            </button>
          </>
        }
      >
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Prescription / Treatment Notes
        </label>
        <textarea
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          rows={4}
          value={prescriptionNotes}
          onChange={(e) => setPrescriptionNotes(e.target.value)}
          placeholder="Diagnosis follow-up, medication, dosage, next visit..."
        />
      </Modal>
    </div>
  );
}
