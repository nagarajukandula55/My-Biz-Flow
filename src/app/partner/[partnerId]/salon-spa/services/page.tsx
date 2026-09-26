import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { salonServiceColumns, salonServiceToRow } from "@/lib/sample-data/salon-spa";
import { listSalonServices } from "@/lib/salonSpa/servicesData";
import { ServicesClientTable } from "./ServicesClientTable";

registerPage({
  id: "salon-spa.services.list",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — Services",
  path: "/partner/[partnerId]/salon-spa/services",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists the partner's Salon & Spa service catalog (name/duration/price) with a \"+ New Service\" action, row-click into a service to edit it or toggle active/inactive. Real data — Prisma-backed (SalonService table, scoped to this partner). Appointments reference a service by id and copy its name/duration/price at booking time.",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/services/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SalonServicesPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("salon-spa");
  const services = await listSalonServices(params.partnerId, true);
  const rows = services.map(salonServiceToRow);

  return (
    <AppShell
      topbarTitle={`Services — ${mod?.label ?? "Salon & Spa"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/salon-spa/services/new`} className="btn-accent">
          + New Service
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">The service catalog appointments are booked against — name, duration, price.</p>
        <div className="mt-6">
          <ServicesClientTable partnerId={params.partnerId} columns={salonServiceColumns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
