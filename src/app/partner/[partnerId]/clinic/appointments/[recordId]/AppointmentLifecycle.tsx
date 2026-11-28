"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { completeAppointmentAction, createInvoiceFromAppointmentAction } from "../actions";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Scheduled: "teal",
  "In consultation": "warning",
  Completed: "success",
  "No-show": "danger",
  Cancelled: "neutral",
};

/**
 * Consultation completion + billing panel shown above the read-only
 * appointment detail grid — same shape as the previous BusinessRecord-era
 * ClinicLifecycle: marking an appointment Completed appends a new
 * Prescription row (see completeAppointmentAction -> completeAppointment),
 * then a Billing invoice can be raised for the consultation fee.
 */
export function AppointmentLifecycle({
  partnerId,
  appointmentId,
  initialStatus,
  invoiceId,
}: {
  partnerId: string;
  appointmentId: string;
  initialStatus: string;
  invoiceId?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [invoice, setInvoice] = useState(invoiceId ?? undefined);
  const [error, setError] = useState("");
  const [pending, startPersist] = useTransition();

  function submitCompletion() {
    startPersist(async () => {
      setError("");
      try {
        await completeAppointmentAction(partnerId, appointmentId, prescriptionNotes);
        setStatus("Completed");
        setCompleteOpen(false);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete this visit."); }
    });
  }

  function createInvoice() {
    startPersist(async () => {
      setError("");
      try {
        await createInvoiceFromAppointmentAction(partnerId, appointmentId);
        setInvoice("pending"); // page revalidation fills in the real id on next load
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the invoice."); }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</span>
          <StatusChip label={status} variant={STATUS_VARIANT[status] ?? "neutral"} />
        </div>
        <div className="flex items-center gap-3">
          {status !== "Completed" && status !== "Cancelled" && status !== "No-show" && (
            <button type="button" className="btn-accent" disabled={pending} onClick={() => setCompleteOpen(true)}>
              Mark Completed
            </button>
          )}
          {status === "Completed" && !invoice && (
            <button type="button" className="btn-outline" disabled={pending} onClick={createInvoice}>
              Create Invoice
            </button>
          )}
          {status === "Completed" && invoice && invoice !== "pending" && (
            <Link href={`/partner/${partnerId}/billing/${invoice}`} className="btn-outline">
              Sales Invoice
            </Link>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

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
            <button type="button" className="btn-accent" disabled={pending} onClick={submitCompletion}>
              {pending ? "Saving..." : "Mark Completed"}
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
