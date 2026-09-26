import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAppointment, listPatients, APPOINTMENT_STATUSES, DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@/lib/clinic";
import { updateAppointmentAction } from "../../actions";

registerPage({
  id: "clinic.appointments.edit",
  moduleSlug: "clinic",
  title: "Clinic — Edit Appointment",
  path: "/partner/[partnerId]/clinic/appointments/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Appointment's real data, letting a user edit or reschedule it. Submission runs updateAppointmentAction, which re-checks the doctor's slot for conflicts (excluding this appointment itself) before saving a rescheduled date/time.",
  sourceFile: "src/app/partner/[partnerId]/clinic/appointments/[recordId]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditClinicAppointmentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");
  const appointment = await getAppointment(params.partnerId, params.recordId);
  if (!appointment) notFound();
  const patients = await listPatients(params.partnerId);

  const fields: FormFieldDef[] = [
    {
      key: "patientId",
      label: "Patient",
      type: "select",
      required: true,
      options: patients.map((p) => p.id),
      optionLabels: Object.fromEntries(patients.map((p) => [p.id, p.name])),
    },
    { key: "doctor", label: "Doctor", type: "text", required: true },
    { key: "appointmentDateTime", label: "Appointment Date/Time", type: "datetime", required: true },
    { key: "durationMinutes", label: "Duration (min)", type: "number", required: false, placeholder: String(DEFAULT_APPOINTMENT_DURATION_MINUTES) },
    { key: "diagnosis", label: "Diagnosis", type: "textarea", required: false },
    { key: "consultationFeeRupees", label: "Consultation Fee", type: "currency", required: true },
    { key: "status", label: "Status", type: "select", required: false, options: APPOINTMENT_STATUSES },
  ];

  return (
    <AppShell topbarTitle={`Edit Appointment — ${mod?.label ?? "Clinic"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">{appointment.patient.name} &middot; {appointment.doctor}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              patientId: appointment.patientId,
              doctor: appointment.doctor,
              appointmentDateTime: toDatetimeLocal(appointment.appointmentDateTime),
              durationMinutes: appointment.durationMinutes,
              diagnosis: appointment.diagnosis ?? "",
              consultationFeeRupees: appointment.consultationFee / 100,
              status: appointment.status,
            }}
            submitLabel="Save changes"
            action={updateAppointmentAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
