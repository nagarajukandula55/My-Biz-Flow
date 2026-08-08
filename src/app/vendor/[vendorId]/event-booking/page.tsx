import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { EventBookingClientTable } from "./EventBookingClientTable";
import { EventBookingNewButton } from "./EventBookingNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { eventBookingColumns } from "@/lib/sample-data/event-booking";
import { listBusinessRecords } from "@/lib/businessRecords";

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

export const dynamic = "force-dynamic";

export default async function EventBookingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("event-booking");
  const columns = await applyCustomizations("event-booking.list", eventBookingColumns);
  const rows = await listBusinessRecords(params.vendorId, "event-booking");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Event / Venue Booking"}
      topbarActions={
        <EventBookingNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <EventBookingClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

