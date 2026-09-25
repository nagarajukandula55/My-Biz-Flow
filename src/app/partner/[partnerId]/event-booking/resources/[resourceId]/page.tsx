import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getEventResource } from "@/lib/eventBooking";
import { updateEventResourceAction } from "../actions";

registerPage({
  id: "event-booking.resources.edit",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Edit Resource",
  path: "/partner/[partnerId]/event-booking/resources/[resourceId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing EventResource row — name, category, active state.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/resources/[resourceId]/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Resource Name", type: "text", required: true },
  { key: "category", label: "Category", type: "text", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function EditEventResourcePage({ params }: { params: { partnerId: string; resourceId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const resource = await getEventResource(params.partnerId, params.resourceId);
  if (!resource) notFound();

  return (
    <AppShell topbarTitle={`Edit Resource — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text">Edit Resource</h1>
          <Link href={`/partner/${params.partnerId}/event-booking/resources`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ name: resource.name, category: resource.category ?? "", isActive: resource.isActive }}
            submitLabel="Save changes"
            action={updateEventResourceAction.bind(null, params.partnerId, params.resourceId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
