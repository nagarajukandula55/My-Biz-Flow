import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createVenueAction } from "../actions";

registerPage({
  id: "event-booking.venues.create",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — New Venue",
  path: "/partner/[partnerId]/event-booking/venues/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new Venue row (Prisma-backed) — name, address, capacity — selectable on an Event Booking.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/venues/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Venue Name", type: "text", required: true },
  { key: "address", label: "Address", type: "textarea", required: false },
  { key: "capacity", label: "Capacity", type: "number", required: false },
];

export default async function NewVenuePage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");

  return (
    <AppShell topbarTitle={`New Venue — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Venue</h1>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Venue" action={createVenueAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
