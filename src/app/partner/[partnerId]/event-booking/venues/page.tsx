import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listVenues } from "@/lib/eventBooking";
import { VenuesClientTable } from "./VenuesClientTable";

registerPage({
  id: "event-booking.venues.list",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Venues",
  path: "/partner/[partnerId]/event-booking/venues",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every Venue (Prisma-backed) a partner can select when creating an Event Booking — name, address, capacity, active state.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/venues/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Venue Name", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "capacity", label: "Capacity", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export default async function VenuesPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const venues = await listVenues(params.partnerId);
  const rows: Row[] = venues.map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address ?? "",
    capacity: v.capacity ?? "",
    isActive: v.isActive,
  }));

  return (
    <AppShell
      topbarTitle={`Venues — ${mod?.label ?? "Event / Venue Booking"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/event-booking/venues/new`} className="btn-accent">
          + New Venue
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Venues available for Event Bookings.</p>
        <div className="mt-6">
          <VenuesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
