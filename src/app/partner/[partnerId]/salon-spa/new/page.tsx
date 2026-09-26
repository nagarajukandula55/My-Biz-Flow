import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { buildSalonSpaFormFields } from "@/lib/sample-data/salon-spa";
import { applyCustomizations } from "@/lib/designer/customizations";
import { listSalonServices } from "@/lib/salonSpa/servicesData";
import { createSalonSpaBookingAction } from "../[recordId]/actions";

registerPage({
  id: "salon-spa.create",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — New Appointment",
  path: "/partner/[partnerId]/salon-spa/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new appointment in the salon-spa module, built from the module's real field set (including the partner's real active SalonService catalog as the Service dropdown) via the shared RecordForm component. Submission runs createSalonSpaBookingAction, which rejects the save server-side if the chosen stylist already has an overlapping booking before persisting.",
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
  const services = await listSalonServices(params.partnerId);
  const fields = await applyCustomizations("salon-spa.create", buildSalonSpaFormFields(services));

  return (
    <AppShell topbarTitle={`New Appointment — ${mod?.label ?? "Salon & Spa"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new appointment for Salon &amp; Spa.</p>
        {searchParams.conflict && (
          <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {searchParams.conflict}
          </div>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Appointment"
            mode="create"
            action={createSalonSpaBookingAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
