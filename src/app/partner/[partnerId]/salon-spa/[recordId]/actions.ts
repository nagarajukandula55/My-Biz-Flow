"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createSalonAppointment,
  updateSalonAppointment,
  completeSalonAppointment,
  getSalonAppointment,
  SalonScheduleConflictError,
  setSalonAppointmentInvoiceId,
} from "@/lib/salonSpa/appointmentsData";
import { withRecordLock } from "@/lib/withRecordLock";
import { salonPaiseToRupees } from "@/lib/salonSpa/money";

/**
 * Creates a new appointment, rejecting it server-side if the stylist is
 * already booked in an overlapping window (duration comes from the chosen
 * SalonService). On conflict, redirects back to the /new form with a
 * ?conflict= message. Bind with .bind(null, partnerId) before passing as
 * RecordForm's `action` prop.
 */
export async function createSalonSpaBookingAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const stylist = String(values["stylist"] ?? "");
  const appointmentDate = String(values["appointmentDate"] ?? "");
  const serviceId = String(values["serviceId"] ?? "");
  let record;
  try {
    record = await createSalonAppointment(partnerId, {
      customer: String(values["customer"] ?? ""),
      serviceId,
      stylist,
      appointmentDate: new Date(appointmentDate),
      branch: values["branch"] ? String(values["branch"]) : undefined,
      commissionPercent: values["commissionPercent"] !== "" && values["commissionPercent"] != null ? Number(values["commissionPercent"]) : undefined,
    });
  } catch (error) {
    if (!(error instanceof SalonScheduleConflictError)) throw error;
    const qs = new URLSearchParams({ conflict: `${stylist} already has a booking overlapping this time (${error.withRecordId}). Pick a different slot or stylist.` });
    redirect(`/partner/${partnerId}/salon-spa/new?${qs.toString()}`);
  }
  revalidatePath(`/partner/${partnerId}/salon-spa`);
  redirect(`/partner/${partnerId}/salon-spa/${record.id}`);
}

/**
 * Edits an appointment (including rescheduling it), rejecting the save
 * server-side if the new window conflicts with another booking for the
 * same stylist. Bind with .bind(null, partnerId, recordId).
 */
export async function updateSalonSpaBookingAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const stylist = String(values["stylist"] ?? "");
  const appointmentDate = String(values["appointmentDate"] ?? "");
  const serviceId = String(values["serviceId"] ?? "");
  try {
    await updateSalonAppointment(partnerId, recordId, {
      customer: String(values["customer"] ?? ""),
      serviceId,
      stylist,
      appointmentDate: new Date(appointmentDate),
      status: String(values["status"] ?? "Booked"),
      branch: values["branch"] ? String(values["branch"]) : undefined,
      commissionPercent: values["commissionPercent"] !== "" && values["commissionPercent"] != null ? Number(values["commissionPercent"]) : undefined,
    });
  } catch (error) {
    if (!(error instanceof SalonScheduleConflictError)) throw error;
    const qs = new URLSearchParams({ conflict: `${stylist} already has a booking overlapping this time (${error.withRecordId}). Pick a different slot or stylist.` });
    redirect(`/partner/${partnerId}/salon-spa/${recordId}/edit?${qs.toString()}`);
  }
  revalidatePath(`/partner/${partnerId}/salon-spa`);
  revalidatePath(`/partner/${partnerId}/salon-spa/${recordId}`);
  redirect(`/partner/${partnerId}/salon-spa/${recordId}`);
}

/**
 * Marks a booking Completed and computes the stylist's commission amount
 * server-side from the record's own stored price/commissionPercent —
 * never trusts a client-submitted commission figure.
 */
export async function completeSalonSpaBookingAction(partnerId: string, recordId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await completeSalonAppointment(partnerId, recordId);
  revalidatePath(`/partner/${partnerId}/salon-spa/${recordId}`);
}

/**
 * Persists a real Billing invoice for a completed booking's service price
 * — same Billing BusinessRecord creation call as the clinic and
 * service-centre modules use, guarded so it only fires once per booking.
 */
export async function createInvoiceFromBookingAction(partnerId: string, recordId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await withRecordLock("salon-invoice", `${partnerId}:${recordId}`, async () => {
    const record = await getSalonAppointment(partnerId, recordId);
    if (!record || record.status !== "Completed" || record.invoiceId) return;
    // Salon prices are stored in paise; billing BusinessRecord amounts use rupees.
    const price = salonPaiseToRupees(record.price);
    const taxAmount = Math.round(price * 0.18);
    const totalAmount = price + taxAmount;

    const invoice = await createBusinessRecord(partnerId, "billing", {
      customer: record.customer,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      lineItemsSummary: `${record.serviceName} - ${record.stylist}`,
      items: [{ description: record.serviceName, quantity: 1, unit: "service", unitPrice: price, taxRate: 18 }],
      subtotal: price,
      taxAmount,
      totalAmount,
      paymentStatus: "Draft",
      paymentMode: undefined,
      sourceBookingId: recordId,
    });

    await setSalonAppointmentInvoiceId(partnerId, recordId, String(invoice.id));
  });
  revalidatePath(`/partner/${partnerId}/salon-spa/${recordId}`);
}
