import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { EventBookingClientTable } from "./EventBookingClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { eventBookingColumns } from "@/lib/sample-data/event-booking";

registerPage({
  id: "event-booking.list",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — List",
  path: "/vendor/[vendorId]/event-booking",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every event record for the event-booking module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/event-booking/page.tsx",
});

export default async function EventBookingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("event-booking");
  const columns = await applyCustomizations("event-booking.list", eventBookingColumns);

  return (
    <AppShell
      navGroups={await buildVendorNavGroups("event-booking")}
      topbarTitle={mod?.label ?? "Event / Venue Booking"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/event-booking/new`} className="btn-accent">
          + New Event
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <EventBookingClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

