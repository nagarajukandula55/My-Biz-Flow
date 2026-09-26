import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { formatDateTime, formatCurrencyINR } from "@/lib/format";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getPatient } from "@/lib/clinic";
import { updatePatientAction } from "../actions";

registerPage({
  id: "clinic.patients.detail",
  moduleSlug: "clinic",
  title: "Clinic — Patient Detail",
  path: "/partner/[partnerId]/clinic/patients/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Patient detail fields" },
    { key: "appointment-history", label: "Appointment history" },
    { key: "prescription-history", label: "Prescription history" },
  ],
  explanation: "A patient's own profile (editable in place via RecordForm — name/phone/email/insurance) plus their full Appointment history and every Prescription recorded across those appointments, most recent first.",
  sourceFile: "src/app/partner/[partnerId]/clinic/patients/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "name", label: "Patient Name", type: "text", required: true },
  { key: "phone", label: "Phone", type: "phone", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "insuranceProvider", label: "Insurance Provider", type: "text", required: false },
];

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Scheduled: "teal",
  "In consultation": "warning",
  Completed: "success",
  "No-show": "danger",
  Cancelled: "neutral",
};

export default async function ClinicPatientDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");
  const patient = await getPatient(params.partnerId, params.recordId);
  if (!patient) notFound();

  const allPrescriptions = patient.appointments
    .flatMap((a) => a.prescriptions.map((p) => ({ ...p, appointmentDateTime: a.appointmentDateTime, doctor: a.doctor, appointmentId: a.id })))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <AppShell topbarTitle={`${patient.name} — ${mod?.label ?? "Clinic"}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{patient.name}</h1>
            <p className="mt-1 text-xs text-text-muted">Patient profile</p>
          </div>
          <Link href={`/partner/${params.partnerId}/clinic/patients`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              name: patient.name,
              phone: patient.phone ?? "",
              email: patient.email ?? "",
              insuranceProvider: patient.insuranceProvider ?? "",
            }}
            submitLabel="Save changes"
            action={updatePatientAction.bind(null, params.partnerId, patient.id)}
          />
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-text">Appointments</h2>
            <Link
              href={`/partner/${params.partnerId}/clinic/appointments/new?patientId=${patient.id}`}
              className="btn-outline"
            >
              + New Appointment
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {patient.appointments.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No appointments yet.
              </p>
            )}
            {patient.appointments.map((a) => (
              <Link
                key={a.id}
                href={`/partner/${params.partnerId}/clinic/appointments/${a.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-4 py-3 text-sm hover:border-accent"
              >
                <div>
                  <div className="font-medium text-text">{a.doctor}</div>
                  <div className="text-xs text-text-muted">{formatDateTime(a.appointmentDateTime.toISOString())}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-muted">{formatCurrencyINR(a.consultationFee / 100)}</span>
                  <StatusChip label={a.status} variant={STATUS_VARIANT[a.status] ?? "neutral"} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-text">Prescription History</h2>
          <div className="mt-3 space-y-2">
            {allPrescriptions.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No prescriptions recorded yet.
              </p>
            )}
            {allPrescriptions.map((p) => (
              <div key={p.id} className="rounded-md border border-border bg-bg-raised p-4">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>
                    {p.doctor} &middot; {formatDateTime(p.appointmentDateTime.toISOString())}
                  </span>
                  <Link href={`/partner/${params.partnerId}/clinic/appointments/${p.appointmentId}`} className="text-teal hover:underline">
                    View appointment
                  </Link>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text">{p.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
