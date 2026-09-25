import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listOfficeLocations } from "@/lib/hrms";
import { OfficeLocationsClientTable } from "./OfficeLocationsClientTable";

registerPage({
  id: "hrms.office-locations.list",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Office Locations",
  path: "/partner/[partnerId]/hrms/office-locations",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every registered OfficeLocation (Prisma-backed) — name, lat/lng, geofence radius — that the live Attendance app's check-in flow validates against.",
  sourceFile: "src/app/partner/[partnerId]/hrms/office-locations/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "lat", label: "Latitude", type: "text" },
  { key: "lng", label: "Longitude", type: "text" },
  { key: "geofenceRadiusMeters", label: "Geofence Radius (m)", type: "text" },
];

export default async function OfficeLocationsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const locations = await listOfficeLocations(params.partnerId);
  const rows: Row[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    geofenceRadiusMeters: l.geofenceRadiusMeters,
  }));

  return (
    <AppShell
      topbarTitle={`Office Locations — ${mod?.label ?? "HRMS / Payroll"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/hrms/office-locations/new`} className="btn-accent">
          + New Office Location
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Registered site(s) that live attendance check-ins are validated against.</p>
        <div className="mt-6">
          <OfficeLocationsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
