import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listServices } from "@/lib/fieldForce/servicesData";
import { createBookingAction } from "@/lib/fieldForce/actions";
import { NewBookingForm } from "./NewBookingForm";

registerPage({
  id: "field-force.bookings.new",
  moduleSlug: "field-force",
  title: "Field Force — New Booking",
  path: "/partner/[partnerId]/field-force/bookings/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Creates a Booking on behalf of a customer: captures the customer (matched or created by phone) and their address, the priced Service, and a schedule date/slot — priceAmount is computed from the Service's current price at creation time. Real data — Prisma-backed (Customer/Address/Booking tables).",
  sourceFile: "src/app/partner/[partnerId]/field-force/bookings/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewBookingPage({ params }: { params: { partnerId: string } }) {
  const services = await listServices();
  const action = createBookingAction.bind(null, params.partnerId);

  return (
    <AppShell topbarTitle="New Booking">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Booking</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Book a service for a customer — pick the service, schedule a slot, and it's ready to dispatch from Job
          Allocation.
        </p>
        <div className="mt-6">
          <NewBookingForm services={services} action={action} />
        </div>
      </div>
    </AppShell>
  );
}
