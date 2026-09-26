import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail, type RecordField, type TimelineEntry } from "@/components/RecordDetail";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAppointment } from "@/lib/clinic";
import type { StatusVariant } from "@/components/StatusChip";
import { AppointmentLifecycle } from "./AppointmentLifecycle";
import { DeleteAppointmentButton } from "./DeleteAppointmentButton";

registerPage({
  id: "clinic.appointments.detail",
  moduleSlug: "clinic",
  title: "Clinic — Appointment Detail",
  path: "/partner/[partnerId]/clinic/appointments/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "prescriptions", label: "Prescription history" },
    { key: "completion-panel", label: "Consultation completion & billing panel" },
  ],
  explanation: "Read-only detail view of a single Appointment (Prisma-backed), rendered via the shared RecordDetail component (field grid + activity timeline), plus this appointment's own Prescription history. The AppointmentLifecycle panel above it captures prescription/treatment notes when staff mark the appointment Completed (appending a new Prescription row), and creates a real Billing invoice for the consultation fee from there.",
  sourceFile: "src/app/partner/[partnerId]/clinic/appointments/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Scheduled: "teal",
  "In consultation": "warning",
  Completed: "success",
  "No-show": "danger",
  Cancelled: "neutral",
};

export default async function ClinicAppointmentDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");
  const appointment = await getAppointment(params.partnerId, params.recordId);
  if (!appointment) notFound();

  const fields: RecordField[] = [
    { label: "Patient", value: appointment.patient.name, type: "relation" },
    { label: "Doctor", value: appointment.doctor, type: "text" },
    { label: "Appointment Date/Time", value: appointment.appointmentDateTime.toISOString(), type: "date" },
    { label: "Duration (min)", value: appointment.durationMinutes, type: "text" },
    { label: "Diagnosis", value: appointment.diagnosis || "—", type: "text" },
    { label: "Consultation Fee", value: appointment.consultationFee / 100, type: "currency" },
    { label: "Status", value: appointment.status, type: "select", chipVariant: STATUS_VARIANT[appointment.status] ?? "neutral" },
    { label: "Invoice", value: appointment.invoiceId || "Not yet invoiced", type: "text" },
  ];

  const timeline: TimelineEntry[] = [
    { id: "t1", label: "Appointment booked", timestamp: appointment.createdAt.toISOString(), actor: "Reception" },
    ...appointment.prescriptions.map((p) => ({
      id: p.id,
      label: "Prescription recorded",
      timestamp: p.createdAt.toISOString(),
      actor: appointment.doctor,
    })),
  ];

  const recordLabel = `${appointment.patient.name} — ${appointment.doctor}`;

  return (
    <AppShell topbarTitle={mod?.label ?? "Clinic"}>
      <div>
        <AppointmentLifecycle
          partnerId={params.partnerId}
          appointmentId={appointment.id}
          initialStatus={appointment.status}
          invoiceId={appointment.invoiceId}
        />

        <div className="mt-6">
          <RecordDetail
            fields={fields}
            recordLabel={recordLabel}
            searchParams={searchParams}
            timeline={timeline}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Appointment detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/partner/${params.partnerId}/clinic/appointments`} className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/partner/${params.partnerId}/clinic/patients/${appointment.patientId}`} className="btn-outline">
                    View Patient
                  </Link>
                  <Link href={`/partner/${params.partnerId}/clinic/appointments/${appointment.id}/edit`} className="btn-outline">
                    Edit
                  </Link>
                  <DeleteAppointmentButton partnerId={params.partnerId} appointmentId={appointment.id} label={recordLabel} />
                </div>
              </div>
            }
          />
        </div>

        {appointment.prescriptions.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold text-text">Prescriptions for this appointment</h2>
            <div className="mt-3 space-y-2">
              {appointment.prescriptions.map((p) => (
                <div key={p.id} className="rounded-md border border-border bg-bg-raised p-4">
                  <div className="text-xs text-text-muted">{p.createdAt.toLocaleString("en-IN")}</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text">{p.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
