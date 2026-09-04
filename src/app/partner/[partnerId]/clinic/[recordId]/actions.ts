"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@/lib/sample-data/clinic";

function windowFor(dateTimeIso: string, durationMinutes: number): { start: number; end: number } {
  const start = new Date(dateTimeIso).getTime();
  return { start, end: start + durationMinutes * 60_000 };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Real slot-conflict check: a doctor cannot be double-booked in the same
 * time window. Queries every other clinic BusinessRecord for this partner
 * (tenant-scoped) with the same doctor, and rejects if the proposed
 * [start, start+duration) window overlaps an existing non-cancelled
 * appointment's window. Exported so both the create and reschedule paths
 * enforce it identically.
 */
export async function findClinicSlotConflict(
  partnerId: string,
  doctor: string,
  appointmentDateTime: string,
  durationMinutes: number = DEFAULT_APPOINTMENT_DURATION_MINUTES,
  excludeRecordId?: string
): Promise<{ conflict: false } | { conflict: true; withRecordId: string }> {
  if (!doctor || !appointmentDateTime) return { conflict: false };
  const { start, end } = windowFor(appointmentDateTime, durationMinutes || DEFAULT_APPOINTMENT_DURATION_MINUTES);
  if (Number.isNaN(start)) return { conflict: false };

  const records = await listBusinessRecords(partnerId, "clinic");
  for (const r of records) {
    if (excludeRecordId && String(r["id"]) === excludeRecordId) continue;
    if (String(r["doctor"] ?? "") !== doctor) continue;
    if (r["status"] === "Cancelled") continue;
    const otherDateTime = r["appointmentDateTime"];
    if (!otherDateTime) continue;
    const otherDuration = Number(r["durationMinutes"]) || DEFAULT_APPOINTMENT_DURATION_MINUTES;
    const { start: oStart, end: oEnd } = windowFor(String(otherDateTime), otherDuration);
    if (Number.isNaN(oStart)) continue;
    if (overlaps(start, end, oStart, oEnd)) {
      return { conflict: true, withRecordId: String(r["id"]) };
    }
  }
  return { conflict: false };
}

/**
 * Creates a new appointment, rejecting it server-side if the doctor is
 * already booked in an overlapping window. On conflict, redirects back to
 * the /new form with a ?conflict= message instead of throwing across the
 * server-action boundary. Bind with .bind(null, partnerId) before passing
 * as RecordForm's `action` prop.
 */
export async function createClinicAppointmentAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  const doctor = String(values["doctor"] ?? "");
  const appointmentDateTime = String(values["appointmentDateTime"] ?? "");
  const durationMinutes = Number(values["durationMinutes"]) || DEFAULT_APPOINTMENT_DURATION_MINUTES;

  const conflict = await findClinicSlotConflict(partnerId, doctor, appointmentDateTime, durationMinutes);
  if (conflict.conflict) {
    const qs = new URLSearchParams({
      conflict: `${doctor} already has an appointment overlapping this time (${conflict.withRecordId}). Pick a different slot.`,
    });
    redirect(`/partner/${partnerId}/clinic/new?${qs.toString()}`);
  }

  const record = await createBusinessRecord(partnerId, "clinic", { ...values, durationMinutes });
  revalidatePath(`/partner/${partnerId}/clinic`);
  redirect(`/partner/${partnerId}/clinic/${record.id}`);
}

/**
 * Edits an appointment (including rescheduling its date/time), rejecting
 * the save server-side if the new window conflicts with another
 * appointment for the same doctor. Bind with .bind(null, partnerId, recordId).
 */
export async function updateClinicAppointmentAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void> {
  const doctor = String(values["doctor"] ?? "");
  const appointmentDateTime = String(values["appointmentDateTime"] ?? "");
  const durationMinutes = Number(values["durationMinutes"]) || DEFAULT_APPOINTMENT_DURATION_MINUTES;

  const conflict = await findClinicSlotConflict(partnerId, doctor, appointmentDateTime, durationMinutes, recordId);
  if (conflict.conflict) {
    const qs = new URLSearchParams({
      conflict: `${doctor} already has an appointment overlapping this time (${conflict.withRecordId}). Pick a different slot.`,
    });
    redirect(`/partner/${partnerId}/clinic/${recordId}/edit?${qs.toString()}`);
  }

  await updateBusinessRecord(partnerId, "clinic", recordId, { ...values, durationMinutes });
  revalidatePath(`/partner/${partnerId}/clinic`);
  revalidatePath(`/partner/${partnerId}/clinic/${recordId}`);
  redirect(`/partner/${partnerId}/clinic/${recordId}`);
}

/**
 * Marks an appointment Completed and captures prescription/treatment
 * notes at the same time — called from the detail page's completion
 * modal, not the generic edit form.
 */
export async function completeClinicAppointmentAction(
  partnerId: string,
  recordId: string,
  prescriptionNotes: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "clinic", recordId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "clinic", recordId, {
    ...record,
    status: "Completed",
    prescriptionNotes,
  });
  revalidatePath(`/partner/${partnerId}/clinic/${recordId}`);
}

/**
 * Persists a real Billing invoice for a completed appointment's
 * consultation fee — mirrors service-centre's
 * createInvoiceFromWorkorderAction pattern exactly (same Billing
 * BusinessRecord creation call, guarded so it only fires once). The fee
 * is read from the server-stored record, never trusted from the client.
 */
export async function createInvoiceFromAppointmentAction(partnerId: string, recordId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "clinic", recordId);
  if (!record) return;
  if (record["status"] !== "Completed") return;
  if (record["invoiceId"]) return; // already invoiced — don't double-create

  const consultationFee = Number(record["consultationFee"] ?? 0);
  const taxAmount = Math.round(consultationFee * 0.18);
  const totalAmount = consultationFee + taxAmount;

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["patientName"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: `Consultation — ${record["doctor"] ?? "Doctor"}`,
    subtotal: consultationFee,
    taxAmount,
    totalAmount,
    paymentStatus: "Draft",
    paymentMode: undefined,
    sourceAppointmentId: recordId,
  });

  await updateBusinessRecord(partnerId, "clinic", recordId, { ...record, invoiceId: invoice.id });
  revalidatePath(`/partner/${partnerId}/clinic/${recordId}`);
}
