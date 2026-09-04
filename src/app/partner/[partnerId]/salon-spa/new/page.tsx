import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { salonSpaFormFields } from "@/lib/sample-data/salon-spa";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createSalonSpaBookingAction } from "../[recordId]/actions";

registerPage({
  id: "salon-spa.create",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — Create",
  path: "/partner/[partnerId]/salon-spa/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new booking in the salon-spa module, built from the module's real field set via the shared RecordForm component. Submission runs createSalonSpaBookingAction, which rejects the save server-side if the chosen stylist already has an overlapping booking before persisting.",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/new/page.tsx",
});

export default async function NewSalonSpaPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { conflict?: string };
}) {
  const mod = await getModule("salon-spa");
  const fields = await applyCustomizations("salon-spa.create", salonSpaFormFields);

  return (
    <AppShell topbarTitle={`New Booking — ${mod?.label ?? "Salon & Spa"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Booking</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new booking record for Salon &amp; Spa.</p>
        {searchParams.conflict && (
          <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {searchParams.conflict}
          </div>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Booking"
            action={createSalonSpaBookingAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
