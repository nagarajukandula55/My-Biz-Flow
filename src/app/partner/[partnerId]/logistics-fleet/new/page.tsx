import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listVehicles, listDrivers } from "@/lib/logisticsFleet";
import { createTripAction } from "../[recordId]/actions";

registerPage({
  id: "logistics-fleet.create",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Create",
  path: "/partner/[partnerId]/logistics-fleet/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new Trip (Prisma-backed), built via the shared RecordForm component, optionally assigning an existing Vehicle and Driver at creation time.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewLogisticsFleetPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const [vehicles, drivers] = await Promise.all([listVehicles(params.partnerId), listDrivers(params.partnerId)]);

  const fields: FormFieldDef[] = [
    {
      key: "vehicleId",
      label: "Vehicle",
      type: "select",
      required: false,
      options: vehicles.map((v) => v.id),
      optionLabels: Object.fromEntries(vehicles.map((v) => [v.id, v.vehicleNumber])),
    },
    {
      key: "driverId",
      label: "Driver",
      type: "select",
      required: false,
      options: drivers.map((d) => d.id),
      optionLabels: Object.fromEntries(drivers.map((d) => [d.id, d.name])),
    },
    { key: "origin", label: "Origin", type: "text", required: true },
    { key: "destination", label: "Destination", type: "text", required: true },
    { key: "currentLatitude", label: "Current Latitude", type: "number", required: false },
    { key: "currentLongitude", label: "Current Longitude", type: "number", required: false },
    { key: "deliveryEta", label: "Delivery ETA", type: "date", required: false },
  ];

  return (
    <AppShell topbarTitle={`New Trip — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Trip</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new trip record for Logistics / Fleet.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Trip"
            action={createTripAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
