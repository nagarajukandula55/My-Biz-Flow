import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getVehicle } from "@/lib/logisticsFleet";
import { updateVehicleAction } from "../actions";

registerPage({
  id: "logistics-fleet.vehicles.detail",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Vehicle Detail",
  path: "/partner/[partnerId]/logistics-fleet/vehicles/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Vehicle detail fields" },
    { key: "trip-history", label: "Trip history" },
  ],
  explanation: "A vehicle's own profile (editable in place via RecordForm — number/active status) plus its Trip history.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/vehicles/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "vehicleNumber", label: "Vehicle Number", type: "text", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function VehicleDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const vehicle = await getVehicle(params.partnerId, params.recordId);
  if (!vehicle) notFound();

  return (
    <AppShell topbarTitle={`${vehicle.vehicleNumber} — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{vehicle.vehicleNumber}</h1>
            <p className="mt-1 text-xs text-text-muted">Vehicle profile</p>
          </div>
          <Link href={`/partner/${params.partnerId}/logistics-fleet/vehicles`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ vehicleNumber: vehicle.vehicleNumber, isActive: vehicle.isActive }}
            submitLabel="Save changes"
            action={updateVehicleAction.bind(null, params.partnerId, vehicle.id)}
          />
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-text">Trips</h2>
          <div className="mt-3 space-y-2">
            {vehicle.trips.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No trips recorded against this vehicle yet.
              </p>
            )}
            {vehicle.trips.map((t) => (
              <Link
                key={t.id}
                href={`/partner/${params.partnerId}/logistics-fleet/${t.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-4 py-3 text-sm hover:border-accent"
              >
                <div>
                  <div className="font-medium text-text">{t.origin} &rarr; {t.destination}</div>
                  <div className="text-xs text-text-muted">{t.deliveryStage}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
