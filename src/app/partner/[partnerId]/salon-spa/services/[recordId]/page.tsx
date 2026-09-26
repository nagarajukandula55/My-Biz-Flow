import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm } from "@/components/RecordForm";
import { salonServiceFormFields } from "@/lib/sample-data/salon-spa";
import { getSalonService } from "@/lib/salonSpa/servicesData";
import { updateSalonServiceAction } from "../actions";

registerPage({
  id: "salon-spa.services.edit",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — Edit Service",
  path: "/partner/[partnerId]/salon-spa/services/[recordId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing Salon & Spa service — name/duration/price plus an Active toggle (deactivating hides it from the appointment booking dropdown without deleting past appointments' copied service data). Real persistence — writes to the SalonService table.",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/services/[recordId]/page.tsx",
});

export default async function EditSalonServicePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("salon-spa");
  const service = await getSalonService(params.partnerId, params.recordId);
  if (!service) notFound();

  return (
    <AppShell topbarTitle={`Edit Service — ${mod?.label ?? "Salon & Spa"}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{service.name}</h1>
            <p className="mt-1 text-sm text-text-muted">Edit this Salon &amp; Spa service.</p>
          </div>
          <Link href={`/partner/${params.partnerId}/salon-spa/services`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={salonServiceFormFields}
            initialValues={service}
            submitLabel="Save changes"
            action={updateSalonServiceAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
