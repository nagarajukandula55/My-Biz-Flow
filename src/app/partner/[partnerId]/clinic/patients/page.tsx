import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listPatients } from "@/lib/clinic";
import { PatientsClientTable } from "./PatientsClientTable";

registerPage({
  id: "clinic.patients.list",
  moduleSlug: "clinic",
  title: "Clinic — Patients",
  path: "/partner/[partnerId]/clinic/patients",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists every Patient (Prisma-backed) for the clinic module — name, phone, email, insurance provider — with a \"+ New Patient\" action and row-click navigation into that patient's own detail page (which shows their Appointment + Prescription history).",
  sourceFile: "src/app/partner/[partnerId]/clinic/patients/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Patient Name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "insuranceProvider", label: "Insurance Provider", type: "text" },
];

export default async function ClinicPatientsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");
  const patients = await listPatients(params.partnerId);
  const rows: Row[] = patients.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone ?? "",
    email: p.email ?? "",
    insuranceProvider: p.insuranceProvider ?? "",
  }));

  return (
    <AppShell
      topbarTitle={`Patients — ${mod?.label ?? "Clinic"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/clinic/patients/new`} className="btn-accent">
          + New Patient
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Every patient registered with this clinic.</p>
        <div className="mt-6">
          <PatientsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
