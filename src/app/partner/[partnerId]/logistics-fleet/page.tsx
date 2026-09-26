import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listTrips } from "@/lib/logisticsFleet";
import { LogisticsFleetClientTable } from "./LogisticsFleetClientTable";

registerPage({
  id: "logistics-fleet.list",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Trips",
  path: "/partner/[partnerId]/logistics-fleet",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Trip (Prisma-backed) for the logistics-fleet module in a sortable table — vehicle, driver, origin/destination, delivery ETA/stage — with a \"+ New Trip\" action and row-click navigation into the trip's detail view.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "neutral",
  "Out for Delivery": "teal",
  Delivered: "success",
  Failed: "danger",
};

const columns: Column[] = [
  { key: "vehicleNumber", label: "Vehicle", type: "text" },
  { key: "driverName", label: "Driver", type: "text" },
  { key: "origin", label: "Origin", type: "text" },
  { key: "destination", label: "Destination", type: "text" },
  { key: "deliveryEta", label: "Delivery ETA", type: "date" },
  { key: "deliveryStage", label: "Delivery Stage", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export default async function LogisticsFleetPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const trips = await listTrips(params.partnerId);
  const rows: Row[] = trips.map((t) => ({
    id: t.id,
    vehicleNumber: t.vehicle?.vehicleNumber ?? "",
    driverName: t.driverName ?? "",
    origin: t.origin,
    destination: t.destination,
    deliveryEta: t.deliveryEta ? t.deliveryEta.toISOString() : "",
    deliveryStage: t.deliveryStage,
  }));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Logistics / Fleet"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/logistics-fleet/new`} className="btn-accent">
          + New Trip
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LogisticsFleetClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
