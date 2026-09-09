import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listProviders } from "@/lib/fieldForce/providersData";
import { listAllocationsForPartner } from "@/lib/fieldForce/allocationsData";
import { listBookingsForPartner } from "@/lib/fieldForce/bookingsData";
import { allocateProviderAction, updateAllocationStatusAction } from "@/lib/fieldForce/actions";
import { AllocationsClient } from "./AllocationsClient";

registerPage({
  id: "field-force.allocations",
  moduleSlug: "field-force",
  title: "Field Force — Job Allocation",
  path: "/partner/[partnerId]/field-force/allocations",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The manual/fallback dispatch tool: pick an unassigned Booking and narrow the Provider pool to eligible candidates (findEligibleProviders, src/lib/fieldForce/matching.ts) by that booking's service + address pincode, then assign. Most bookings dispatch automatically via matchingEngine.ts's JobOffer fan-out — this page exists for when nobody accepts an automated offer, or for direct ops-driven assignment.",
  sourceFile: "src/app/partner/[partnerId]/field-force/allocations/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AllocationsPage({ params }: { params: { partnerId: string } }) {
  const [providers, bookings, allocations] = await Promise.all([
    listProviders(params.partnerId),
    listBookingsForPartner(params.partnerId),
    listAllocationsForPartner(params.partnerId),
  ]);

  const unassignedBookings = bookings
    .filter((b) => !b.providerId && b.status !== "cancelled")
    .map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      customerName: b.customerName,
      serviceId: b.serviceId,
      serviceName: b.serviceName,
      pincode: b.addressPincode,
      state: b.addressState,
    }));

  const allocateAction = allocateProviderAction.bind(null, params.partnerId);
  const updateStatusAction = updateAllocationStatusAction.bind(null, params.partnerId);

  return (
    <AppShell topbarTitle="Job Allocation">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Job Allocation</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Match a booking to eligible Field Force providers by service and pincode, then assign.
        </p>
        <div className="mt-6">
          <AllocationsClient
            providers={providers}
            unassignedBookings={unassignedBookings}
            partnerId={params.partnerId}
            allocations={allocations.map((a) => ({
              id: a.id,
              providerName: a.providerName,
              bookingId: a.bookingId,
              bookingNumber: a.bookingNumber,
              status: a.status,
              assignedAt: a.assignedAt.toISOString(),
            }))}
            allocateAction={allocateAction}
            updateStatusAction={updateStatusAction}
          />
        </div>
      </div>
    </AppShell>
  );
}
