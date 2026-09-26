import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listVehicles } from "@/lib/logisticsFleet";
import { VehiclesClientTable } from "./VehiclesClientTable";

registerPage({
  id: "logistics-fleet.vehicles.list",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Vehicles",
  path: "/partner/[partnerId]/logistics-fleet/vehicles",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists every Vehicle (Prisma-backed) in this partner's fleet — vehicle number, active status — with a \"+ New Vehicle\" action and row-click navigation into that vehicle's own detail/edit page.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/vehicles/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "vehicleNumber", label: "Vehicle Number", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export default async function VehiclesPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const vehicles = await listVehicles(params.partnerId);
  const rows: Row[] = vehicles.map((v) => ({
    id: v.id,
    vehicleNumber: v.vehicleNumber,
    isActive: v.isActive,
  }));

  return (
    <AppShell
      topbarTitle={`Vehicles — ${mod?.label ?? "Logistics / Fleet"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/logistics-fleet/vehicles/new`} className="btn-accent">
          + New Vehicle
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Every vehicle registered in this partner's fleet.</p>
        <div className="mt-6">
          <VehiclesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
