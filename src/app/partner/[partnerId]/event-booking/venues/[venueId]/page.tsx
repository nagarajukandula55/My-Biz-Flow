import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getVenue } from "@/lib/eventBooking";
import { updateVenueAction } from "../actions";

registerPage({
  id: "event-booking.venues.edit",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Edit Venue",
  path: "/partner/[partnerId]/event-booking/venues/[venueId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing Venue row — name, address, capacity, active state.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/venues/[venueId]/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Venue Name", type: "text", required: true },
  { key: "address", label: "Address", type: "textarea", required: false },
  { key: "capacity", label: "Capacity", type: "number", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function EditVenuePage({ params }: { params: { partnerId: string; venueId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const venue = await getVenue(params.partnerId, params.venueId);
  if (!venue) notFound();

  return (
    <AppShell topbarTitle={`Edit Venue — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text">Edit Venue</h1>
          <Link href={`/partner/${params.partnerId}/event-booking/venues`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ name: venue.name, address: venue.address ?? "", capacity: venue.capacity ?? "", isActive: venue.isActive }}
            submitLabel="Save changes"
            action={updateVenueAction.bind(null, params.partnerId, params.venueId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
