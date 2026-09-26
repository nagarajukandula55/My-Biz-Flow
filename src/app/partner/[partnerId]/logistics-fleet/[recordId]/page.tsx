import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail, type RecordField, type TimelineEntry } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getTrip, listDrivers, listVehicles } from "@/lib/logisticsFleet";
import { DeliveryLifecycle } from "./DeliveryLifecycle";
import { DeleteTripButton } from "./DeleteTripButton";

registerPage({
  id: "logistics-fleet.detail",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Detail",
  path: "/partner/[partnerId]/logistics-fleet/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Trip (Prisma-backed), rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The DeliveryLifecycle panel above it carries the real domain logic: a Pending -> Out for Delivery -> Delivered/Failed stage stepper with each transition stamped server-side, driver/vehicle assignment against this partner's own registered Driver/Vehicle rows, and delivery-proof capture (recipient name + signature/notes) required only at the Delivered transition.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Pending: "neutral",
  "Out for Delivery": "teal",
  Delivered: "success",
  Failed: "danger",
};

export default async function LogisticsFleetDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const trip = await getTrip(params.partnerId, params.recordId);
  if (!trip) notFound();

  const [drivers, vehicles] = await Promise.all([listDrivers(params.partnerId), listVehicles(params.partnerId)]);
  const driverOptions = drivers.filter((d) => d.isActive).map((d) => ({ value: d.id, label: d.name }));
  const vehicleOptions = vehicles.filter((v) => v.isActive).map((v) => ({ value: v.id, label: v.vehicleNumber }));

  const recordLabel = `${trip.origin} → ${trip.destination}`;

  const fields: RecordField[] = [
    { label: "Vehicle", value: trip.vehicle?.vehicleNumber ?? "—", type: "relation" },
    { label: "Driver", value: trip.driverName ?? "—", type: "relation" },
    { label: "Origin", value: trip.origin, type: "text" },
    { label: "Destination", value: trip.destination, type: "text" },
    { label: "Current Latitude", value: trip.currentLatitude ?? "—", type: "text" },
    { label: "Current Longitude", value: trip.currentLongitude ?? "—", type: "text" },
    { label: "Delivery ETA", value: trip.deliveryEta ? trip.deliveryEta.toISOString() : "—", type: "date" },
    {
      label: "Delivery Stage",
      value: trip.deliveryStage,
      type: "select",
      chipVariant: STATUS_VARIANT[trip.deliveryStage] ?? "neutral",
    },
  ];

  const timeline: TimelineEntry[] = [
    { id: "t1", label: "Trip created", timestamp: trip.createdAt.toISOString(), actor: "Dispatch Team" },
    ...(trip.assignedAt ? [{ id: "t2", label: "Driver/vehicle assigned", timestamp: trip.assignedAt.toISOString(), actor: "Dispatch Team" }] : []),
    ...(trip.outForDeliveryAt ? [{ id: "t3", label: "Marked Out for Delivery", timestamp: trip.outForDeliveryAt.toISOString(), actor: "System" }] : []),
    ...(trip.deliveredAt ? [{ id: "t4", label: "Marked Delivered", timestamp: trip.deliveredAt.toISOString(), actor: "System" }] : []),
    ...(trip.failedAt ? [{ id: "t5", label: "Marked Failed", timestamp: trip.failedAt.toISOString(), actor: "System" }] : []),
  ];

  return (
    <AppShell topbarTitle={mod?.label ?? "Logistics / Fleet"}>
      <div>
        <DeliveryLifecycle
          partnerId={params.partnerId}
          tripId={trip.id}
          initialStage={trip.deliveryStage as "Pending" | "Out for Delivery" | "Delivered" | "Failed"}
          driverId={trip.driverId ?? undefined}
          driverName={trip.driverName ?? undefined}
          vehicleId={trip.vehicleId ?? undefined}
          vehicleNumber={trip.vehicle?.vehicleNumber}
          recipientName={trip.recipientName ?? undefined}
          deliveryNotes={trip.deliveryNotes ?? undefined}
          failureReason={trip.failureReason ?? undefined}
          driverOptions={driverOptions}
          vehicleOptions={vehicleOptions}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Trip detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/logistics-fleet`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/logistics-fleet/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteTripButton partnerId={params.partnerId} tripId={trip.id} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
