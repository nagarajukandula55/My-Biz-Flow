import { withRecordLock } from "@/lib/withRecordLock";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { requireBookingWindow, requirePaise } from "@/lib/bookingValidation";
/**
 * Data-access layer for the Clinic module's Prisma-backed tables (Patient,
 * Appointment, Prescription — see prisma/schema.prisma's "Clinic" block,
 * migration 20260925180000). Replaces the previous BusinessRecord-backed
 * ("clinic" moduleSlug) storage — same conversion this app already did for
 * Event Booking (see src/lib/eventBooking.ts, the reference pattern this
 * file follows: tenant-scoped list/get/create/update, a fail-closed
 * conflict check before a booking-style write, redirect-driven server
 * actions in each route's actions.ts).
 *
 * Relationship modeled: Patient 1--* Appointment 1--* Prescription.
 * A Prescription always belongs to exactly one Appointment (its own
 * consultation visit) and is tenant-scoped only via that parent — it
 * carries no partnerId of its own, matching the schema's own doc comment
 * ("Tenant-scoped via its parent Appointment"). Billing stays its own
 * independently-scoped, BusinessRecord-backed module — an Appointment
 * only carries a loose `invoiceId` pointer once one is raised for it, the
 * same convention every other cross-module pointer in this schema pass
 * uses (no hard FK into Billing's Invoice table).
 *
 * consultationFee is Int paise, matching every other money field in this
 * schema; callers that work in rupees (forms) convert at the boundary.
 */
import { prisma } from "@/lib/prisma";
import { createBusinessRecord } from "@/lib/businessRecords";

export type AppointmentStatus = "Scheduled" | "In consultation" | "Completed" | "No-show" | "Cancelled";
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "Scheduled",
  "In consultation",
  "Completed",
  "No-show",
  "Cancelled",
];

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;

// --- Patients ---------------------------------------------------------------

export async function listPatients(partnerId: string) {
  return prisma.patient.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getPatient(partnerId: string, id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { appointmentDateTime: "desc" },
        include: { prescriptions: { orderBy: { createdAt: "desc" } } },
      },
    },
  });
  if (!patient || patient.partnerId !== partnerId) return null;
  return patient;
}

export async function createPatient(
  partnerId: string,
  data: { name: string; phone?: string; email?: string; insuranceProvider?: string }
) {
  return prisma.patient.create({
    data: {
      partnerId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      insuranceProvider: data.insuranceProvider || null,
    },
  });
}

export async function updatePatient(
  partnerId: string,
  id: string,
  data: { name: string; phone?: string; email?: string; insuranceProvider?: string }
) {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Patient not found.");
  return prisma.patient.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      insuranceProvider: data.insuranceProvider || null,
    },
  });
}

// --- Appointments -------------------------------------------------------------

export async function listAppointments(partnerId: string) {
  return prisma.appointment.findMany({
    where: { partnerId },
    orderBy: { appointmentDateTime: "desc" },
    include: { patient: true },
  });
}

export async function listAppointmentsInRange(partnerId: string, rangeStart: Date, rangeEnd: Date) {
  return prisma.appointment.findMany({
    where: { partnerId, appointmentDateTime: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { appointmentDateTime: "asc" },
    include: { patient: true },
  });
}

export async function getAppointment(partnerId: string, id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, prescriptions: { orderBy: { createdAt: "desc" } } },
  });
  if (!appointment || appointment.partnerId !== partnerId) return null;
  return appointment;
}

function windowFor(dateTime: Date, durationMinutes: number): { start: number; end: number } {
  const start = dateTime.getTime();
  return { start, end: start + durationMinutes * 60_000 };
}

export type DoctorConflict = { appointmentId: string; patientName: string; appointmentDateTime: Date };

/**
 * Fail-closed double-booking check: does any OTHER non-Cancelled
 * appointment for this partner already have the same doctor booked in an
 * overlapping [start, start+duration) window? Same posture and shape as
 * eventBooking.ts's checkResourceConflicts — checked server-side before
 * the write, never trusted from the client. `excludeAppointmentId` lets an
 * edit/reschedule re-check without flagging itself.
 */
export async function checkDoctorConflict(
  partnerId: string,
  doctor: string,
  appointmentDateTime: Date,
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<DoctorConflict | null> {
  if (!doctor || Number.isNaN(appointmentDateTime.getTime())) return null;
  const { start, end } = windowFor(appointmentDateTime, durationMinutes || DEFAULT_APPOINTMENT_DURATION_MINUTES);

  // Evaluate both ends in SQL and return only one collision, rather than
  // loading the doctor's entire appointment history for each reservation.
  // Prisma DateTime columns store UTC without a zone; bind UTC timestamp text
  // so the database session's timezone cannot shift the overlap boundaries.
  const conflicts = await prisma.$queryRaw<DoctorConflict[]>`
    SELECT a.id AS "appointmentId", p.name AS "patientName", a."appointmentDateTime"
    FROM appointments a JOIN patients p ON p.id = a."patientId" AND p."partnerId" = a."partnerId"
    WHERE a."partnerId" = ${partnerId}
      AND lower(trim(a.doctor)) = lower(${doctor.trim()})
      AND a.status <> 'Cancelled'
      AND a."appointmentDateTime" < ${new Date(end).toISOString().slice(0, -1)}::timestamp
      AND a."appointmentDateTime" + a."durationMinutes" * interval '1 minute' > ${new Date(start).toISOString().slice(0, -1)}::timestamp
      AND (${excludeAppointmentId ?? null}::text IS NULL OR a.id <> ${excludeAppointmentId ?? null})
    ORDER BY a."appointmentDateTime", a.id LIMIT 1`;
  return conflicts[0] ?? null;
}

export type CreateAppointmentInput = {
  patientId: string;
  doctor: string;
  appointmentDateTime: Date;
  durationMinutes?: number;
  diagnosis?: string;
  consultationFee: number; // paise
  status?: AppointmentStatus;
};

async function validateAppointment(partnerId: string, input: CreateAppointmentInput): Promise<number> {
  if (input.status && !APPOINTMENT_STATUSES.includes(input.status)) throw new Error("Invalid appointment status.");
  const duration = input.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  if (!input.doctor.trim() || !Number.isSafeInteger(duration) || duration <= 0) throw new Error("Enter a doctor and positive appointment duration.");
  requireBookingWindow(input.appointmentDateTime, new Date(input.appointmentDateTime.getTime() + duration * 60_000));
  requirePaise(input.consultationFee);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, partnerId }, select: { id: true } });
  if (!patient) throw new Error("Patient not found.");
  return duration;
}

export async function createAppointment(
  partnerId: string,
  input: CreateAppointmentInput
): Promise<{ ok: true; id: string } | { ok: false; conflict: DoctorConflict }> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("clinic-bookings", partnerId, async () => {
    const durationMinutes = await validateAppointment(partnerId, input);
    const conflict = input.status === "Cancelled" ? null : await checkDoctorConflict(partnerId, input.doctor, input.appointmentDateTime, durationMinutes);
    if (conflict) return { ok: false, conflict };

    const appointment = await prisma.appointment.create({
      data: {
        partnerId,
        patientId: input.patientId,
        doctor: input.doctor.trim(),
        appointmentDateTime: input.appointmentDateTime,
        durationMinutes,
        diagnosis: input.diagnosis || null,
        consultationFee: input.consultationFee,
        status: input.status ?? "Scheduled",
      },
    });
    return { ok: true, id: appointment.id };
  });
}

export type UpdateAppointmentInput = CreateAppointmentInput;

export async function updateAppointment(
  partnerId: string,
  id: string,
  input: UpdateAppointmentInput
): Promise<{ ok: true } | { ok: false; conflict: DoctorConflict }> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("clinic-bookings", partnerId, async () => {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) throw new Error("Appointment not found.");

    const durationMinutes = await validateAppointment(partnerId, input);
    const conflict = (input.status ?? existing.status) === "Cancelled" ? null : await checkDoctorConflict(partnerId, input.doctor, input.appointmentDateTime, durationMinutes, id);
    if (conflict) return { ok: false, conflict };

    await prisma.appointment.update({
      where: { id },
      data: {
        patientId: input.patientId,
        doctor: input.doctor.trim(),
        appointmentDateTime: input.appointmentDateTime,
        durationMinutes,
        diagnosis: input.diagnosis || null,
        consultationFee: input.consultationFee,
        status: input.status ?? existing.status,
      },
    });
    return { ok: true };
  });
}

export async function setAppointmentStatus(partnerId: string, id: string, status: AppointmentStatus): Promise<void> {
  if (!APPOINTMENT_STATUSES.includes(status)) throw new Error("Invalid appointment status.");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("clinic-bookings", partnerId, async () => {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) throw new Error("Appointment not found.");
    if (status !== "Cancelled") {
      const conflict = await checkDoctorConflict(partnerId, existing.doctor, existing.appointmentDateTime, existing.durationMinutes, id);
      if (conflict) throw new Error("Doctor already has an appointment in this time window.");
    }
    await prisma.appointment.update({ where: { id }, data: { status } });
  });
}

export async function deleteAppointment(partnerId: string, id: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("clinic-bookings", partnerId, async () => {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) return;
    await prisma.$transaction([
      prisma.prescription.deleteMany({ where: { appointmentId: id } }),
      prisma.appointment.delete({ where: { id } }),
    ]);
  });
}

/**
 * Marks an appointment Completed and appends a new Prescription row
 * carrying this visit's notes — appointments keep a full prescription
 * HISTORY (one row per completed consultation) rather than a single
 * overwritten note field, so a patient's prior prescriptions stay visible
 * even after a later visit is also completed.
 */
export async function completeAppointment(partnerId: string, id: string, prescriptionNotes: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("clinic-bookings", partnerId, async () => {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) throw new Error("Appointment not found.");
    if (existing.status === "Cancelled") throw new Error("Reopen the appointment before completing it.");
    await prisma.$transaction([
      prisma.appointment.update({ where: { id }, data: { status: "Completed" } }),
      ...(prescriptionNotes.trim()
        ? [prisma.prescription.create({ data: { appointmentId: id, notes: prescriptionNotes.trim() } })]
        : []),
    ]);
  });
}

function formatPaise(paise: number): string {
  return `Rs ${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Creates a real Billing invoice (BusinessRecord-backed — Billing is
 * explicitly out of scope for this schema pass, see CLAUDE.md) for a
 * completed appointment's consultation fee, mirroring the previous
 * BusinessRecord-era createInvoiceFromAppointmentAction exactly (same
 * Billing shape, same guard against double-invoicing).
 */
export async function createInvoiceFromAppointment(partnerId: string, id: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("clinic-bookings", partnerId, async () => {
    const appointment = await getAppointment(partnerId, id);
    if (!appointment) return;
    if (appointment.status !== "Completed") return;
    if (appointment.invoiceId) return; // already invoiced — don't double-create

    const consultationFee = Math.round(appointment.consultationFee / 100); // rupees, Billing's BusinessRecord shape stores rupees
    const taxAmount = Math.round(consultationFee * 0.18);
    const totalAmount = consultationFee + taxAmount;

    const invoice = await createBusinessRecord(partnerId, "billing", {
      customer: appointment.patient.name,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      lineItemsSummary: `Consultation — ${appointment.doctor}`,
      subtotal: consultationFee,
      taxAmount,
      totalAmount,
      paymentStatus: "Draft",
      paymentMode: undefined,
      sourceAppointmentId: id,
    });

    await prisma.appointment.update({ where: { id }, data: { invoiceId: String(invoice.id) } });
  });
}

export { formatPaise as formatClinicPaise };
