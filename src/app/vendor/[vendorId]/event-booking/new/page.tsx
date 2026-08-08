import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { eventBookingFormFields } from "@/lib/sample-data/event-booking";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "event-booking.create",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Create",
  path: "/vendor/[vendorId]/event-booking/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new event in the event-booking module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/event-booking/new/page.tsx",
});

export default async function NewEventBookingPage() {
  const mod = await getModule("event-booking");
  const fields = await applyCustomizations("event-booking.create", eventBookingFormFields);

  return (
    <AppShell navGroups={await buildVendorNavGroups("event-booking")} topbarTitle={`New Event — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Event</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new event record for Event / Venue Booking.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Event" />
        </div>
      </div>
    </AppShell>
  );
}
