import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { eventBookingFormFields } from "@/lib/sample-data/event-booking";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

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

export default async function EditEventBookingPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("event-booking");
  const record = await getBusinessRecord(params.vendorId, "event-booking", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("event-booking.edit", eventBookingFormFields);

  return (
    <AppShell topbarTitle={`Edit Event — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Event</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "event-booking", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
