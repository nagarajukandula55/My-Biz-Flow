import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEventResources } from "@/lib/eventBooking";
import { ResourcesClientTable } from "./ResourcesClientTable";

registerPage({
  id: "event-booking.resources.list",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Resources",
  path: "/partner/[partnerId]/event-booking/resources",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every EventResource (Prisma-backed) a partner can allocate (with a quantity) to an Event Booking — name, category, active state.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/resources/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Resource Name", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export default async function ResourcesPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const resources = await listEventResources(params.partnerId);
  const rows: Row[] = resources.map((r) => ({ id: r.id, name: r.name, category: r.category ?? "", isActive: r.isActive }));

  return (
    <AppShell
      topbarTitle={`Resources — ${mod?.label ?? "Event / Venue Booking"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/event-booking/resources/new`} className="btn-accent">
          + New Resource
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Resources (equipment, staff, etc.) allocatable to Event Bookings.</p>
        <div className="mt-6">
          <ResourcesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
