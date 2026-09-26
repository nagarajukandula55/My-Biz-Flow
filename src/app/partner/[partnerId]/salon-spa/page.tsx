import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { SalonSpaClientTable } from "./SalonSpaClientTable";
import { SalonSpaNewButton } from "./SalonSpaNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { salonSpaColumns, salonAppointmentToRow } from "@/lib/sample-data/salon-spa";
import { listSalonAppointments } from "@/lib/salonSpa/appointmentsData";
import { listSalonServices } from "@/lib/salonSpa/servicesData";

registerPage({
  id: "salon-spa.list",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — Appointments",
  path: "/partner/[partnerId]/salon-spa",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every appointment for the salon-spa module in a sortable table, with a \"+ New Appointment\" action to create one and row-click navigation into the record's detail view. Real data — Prisma-backed (SalonAppointment table, scoped to this partner).",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SalonSpaPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("salon-spa");
  const columns = await applyCustomizations("salon-spa.list", salonSpaColumns);
  const appointments = await listSalonAppointments(params.partnerId);
  const services = await listSalonServices(params.partnerId);
  const rows = appointments.map(salonAppointmentToRow);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Salon & Spa"}
      topbarActions={<SalonSpaNewButton partnerId={params.partnerId} services={services} />}
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <SalonSpaClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
