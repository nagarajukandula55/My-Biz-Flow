import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createEventResourceAction } from "../actions";

registerPage({
  id: "event-booking.resources.create",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — New Resource",
  path: "/partner/[partnerId]/event-booking/resources/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new EventResource row — name, category — allocatable (with a quantity) on an Event Booking.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/resources/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Resource Name", type: "text", required: true },
  { key: "category", label: "Category", type: "text", required: false },
];

export default async function NewEventResourcePage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");

  return (
    <AppShell topbarTitle={`New Resource — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Resource</h1>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Resource" action={createEventResourceAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
