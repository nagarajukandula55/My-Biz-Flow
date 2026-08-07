import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { eventBookingFormFields, getEventBookingRecord } from "@/lib/sample-data/event-booking";

registerPage({
  id: "event-booking.edit",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Edit",
  path: "/vendor/[vendorId]/event-booking/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing event's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/event-booking/[recordId]/edit/page.tsx",
});

export default function EditEventBookingPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("event-booking");
  const record = getEventBookingRecord(params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("event-booking")} topbarTitle={`Edit Event — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Event</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={eventBookingFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
