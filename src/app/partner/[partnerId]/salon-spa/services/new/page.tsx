import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { salonServiceFormFields } from "@/lib/sample-data/salon-spa";
import { createSalonServiceAction } from "../actions";

registerPage({
  id: "salon-spa.services.create",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — New Service",
  path: "/partner/[partnerId]/salon-spa/services/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new Salon & Spa service (name/duration/price). Real persistence — writes to the SalonService table.",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/services/new/page.tsx",
});

export default async function NewSalonServicePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("salon-spa");

  return (
    <AppShell topbarTitle={`New Service — ${mod?.label ?? "Salon & Spa"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Service</h1>
        <p className="mt-1 text-sm text-text-muted">Add a service to the Salon &amp; Spa catalog.</p>
        <div className="mt-6">
          <RecordForm
            fields={salonServiceFormFields}
            submitLabel="Create Service"
            mode="create"
            action={createSalonServiceAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
