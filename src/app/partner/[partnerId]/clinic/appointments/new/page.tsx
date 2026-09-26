import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listPatients, APPOINTMENT_STATUSES, DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@/lib/clinic";
import { createAppointmentAction } from "../actions";

registerPage({
  id: "clinic.appointments.create",
  moduleSlug: "clinic",
  title: "Clinic — New Appointment",
  path: "/partner/[partnerId]/clinic/appointments/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "A config-driven creation form for a new Appointment against an existing Patient, built via the shared RecordForm component. Submission runs createAppointmentAction, which rejects the save server-side if the chosen doctor already has an overlapping appointment before persisting.",
  sourceFile: "src/app/partner/[partnerId]/clinic/appointments/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewClinicAppointmentPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { patientId?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");
  const patients = await listPatients(params.partnerId);

  if (patients.length === 0) {
    return (
      <AppShell topbarTitle={`New Appointment — ${mod?.label ?? "Clinic"}`}>
        <div className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          No patients registered yet.{" "}
          <Link href={`/partner/${params.partnerId}/clinic/patients/new`} className="font-semibold text-teal hover:underline">
            Register a patient
          </Link>{" "}
          before booking an appointment.
        </div>
      </AppShell>
    );
  }

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
    <AppShell topbarTitle={`New Appointment — ${mod?.label ?? "Clinic"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">Book a new appointment for an existing patient.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={searchParams?.patientId ? { patientId: searchParams.patientId } : undefined}
            submitLabel="Create Appointment"
            action={createAppointmentAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
