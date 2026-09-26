"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  completeAppointment,
  createInvoiceFromAppointment,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
} from "@/lib/clinic";

function toInput(values: Record<string, unknown>) {
  return {
    patientId: String(values["patientId"] ?? ""),
    doctor: String(values["doctor"] ?? ""),
    appointmentDateTime: new Date(String(values["appointmentDateTime"] ?? "")),
    durationMinutes: Number(values["durationMinutes"]) || DEFAULT_APPOINTMENT_DURATION_MINUTES,
    diagnosis: values["diagnosis"] ? String(values["diagnosis"]) : undefined,
    consultationFee: Math.round((Number(values["consultationFeeRupees"]) || 0) * 100),
    status: values["status"] ? (String(values["status"]) as import("@/lib/clinic").AppointmentStatus) : undefined,
  };
}

function conflictMessage(conflict: { patientName: string; appointmentDateTime: Date }): string {
  return `This doctor already has an appointment with ${conflict.patientName} overlapping this time (${conflict.appointmentDateTime.toLocaleString(
    "en-IN"
  )}). Pick a different slot.`;
}

/**
 * Bind with .bind(null, partnerId) before passing as RecordForm's `action`
 * prop — the return shape (`void | { error }`) matches RecordFormAction
 * exactly; a successful save redirects and never returns.
 */
export async function createAppointmentAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.patientId) return { error: "Patient is required." };
  if (!input.doctor.trim()) return { error: "Doctor is required." };
  if (Number.isNaN(input.appointmentDateTime.getTime())) return { error: "Appointment date/time is required." };

  const result = await createAppointment(partnerId, input);
  if (!result.ok) return { error: conflictMessage(result.conflict) };

  revalidatePath(`/partner/${partnerId}/clinic/appointments`);
  revalidatePath(`/partner/${partnerId}/clinic/patients/${input.patientId}`);
  redirect(`/partner/${partnerId}/clinic/appointments/${result.id}`);
}

/** Bind with .bind(null, partnerId, appointmentId). */
export async function updateAppointmentAction(
  partnerId: string,
  appointmentId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.patientId) return { error: "Patient is required." };
  if (!input.doctor.trim()) return { error: "Doctor is required." };
  if (Number.isNaN(input.appointmentDateTime.getTime())) return { error: "Appointment date/time is required." };

  const result = await updateAppointment(partnerId, appointmentId, input);
  if (!result.ok) return { error: conflictMessage(result.conflict) };

  revalidatePath(`/partner/${partnerId}/clinic/appointments`);
  revalidatePath(`/partner/${partnerId}/clinic/appointments/${appointmentId}`);
  revalidatePath(`/partner/${partnerId}/clinic/patients/${input.patientId}`);
  redirect(`/partner/${partnerId}/clinic/appointments/${appointmentId}`);
}

export async function deleteAppointmentAction(partnerId: string, appointmentId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await deleteAppointment(partnerId, appointmentId);
  revalidatePath(`/partner/${partnerId}/clinic/appointments`);
  redirect(`/partner/${partnerId}/clinic/appointments`);
}

export async function completeAppointmentAction(partnerId: string, appointmentId: string, prescriptionNotes: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await completeAppointment(partnerId, appointmentId, prescriptionNotes);
  revalidatePath(`/partner/${partnerId}/clinic/appointments/${appointmentId}`);
}

export async function createInvoiceFromAppointmentAction(partnerId: string, appointmentId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await createInvoiceFromAppointment(partnerId, appointmentId);
  revalidatePath(`/partner/${partnerId}/clinic/appointments/${appointmentId}`);
}
