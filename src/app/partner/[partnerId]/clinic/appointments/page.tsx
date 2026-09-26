import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listAppointments } from "@/lib/clinic";
import { AppointmentsClientTable } from "./AppointmentsClientTable";
import type { StatusVariant } from "@/components/StatusChip";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Scheduled: "teal",
  "In consultation": "warning",
  Completed: "success",
  "No-show": "danger",
  Cancelled: "neutral",
};

registerPage({
  id: "clinic.appointments.list",
  moduleSlug: "clinic",
  title: "Clinic — Appointments",
  path: "/partner/[partnerId]/clinic/appointments",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Appointment (Prisma-backed) for the clinic module — patient, doctor, date/time, status, consultation fee — with a \"+ New Appointment\" action and row-click navigation into the appointment's detail view.",
  sourceFile: "src/app/partner/[partnerId]/clinic/appointments/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "patientName", label: "Patient", type: "relation-link" },
  { key: "doctor", label: "Doctor", type: "text" },
  { key: "appointmentDateTime", label: "Appointment Date/Time", type: "date" },
  { key: "consultationFee", label: "Consultation Fee", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export default async function ClinicAppointmentsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");
  const appointments = await listAppointments(params.partnerId);
  const rows: Row[] = appointments.map((a) => ({
    id: a.id,
    patientName: a.patient.name,
    doctor: a.doctor,
    appointmentDateTime: a.appointmentDateTime.toISOString(),
    consultationFee: a.consultationFee / 100,
    status: a.status,
  }));

  return (
    <AppShell
      topbarTitle={`Appointments — ${mod?.label ?? "Clinic"}`}
      topbarActions={
        <div className="flex items-center gap-3">
          <Link href={`/partner/${params.partnerId}/clinic/appointments/new`} className="btn-accent">
            + New Appointment
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <AppointmentsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
