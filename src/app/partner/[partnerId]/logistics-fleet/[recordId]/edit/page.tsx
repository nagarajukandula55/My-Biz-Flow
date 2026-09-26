import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getTrip, listVehicles, listDrivers } from "@/lib/logisticsFleet";
import { updateTripAction } from "../actions";

registerPage({
  id: "logistics-fleet.edit",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Edit",
  path: "/partner/[partnerId]/logistics-fleet/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Trip's real data (Prisma-backed), letting a user edit and save changes.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/[recordId]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EditLogisticsFleetPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const trip = await getTrip(params.partnerId, params.recordId);
  if (!trip) notFound();
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
    <AppShell topbarTitle={`Edit Trip — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Trip</h1>
        <p className="mt-1 text-sm text-text-muted">{trip.origin} &rarr; {trip.destination}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              vehicleId: trip.vehicleId ?? "",
              driverId: trip.driverId ?? "",
              origin: trip.origin,
              destination: trip.destination,
              currentLatitude: trip.currentLatitude ?? "",
              currentLongitude: trip.currentLongitude ?? "",
              deliveryEta: trip.deliveryEta ? trip.deliveryEta.toISOString().slice(0, 10) : "",
            }}
            submitLabel="Save changes"
            action={updateTripAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
