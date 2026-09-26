import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listAgreements } from "@/lib/rentals";
import { RentalsClientTable } from "./RentalsClientTable";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "warning",
  Confirmed: "teal",
  Ongoing: "amber",
  Completed: "success",
  Cancelled: "danger",
};

registerPage({
  id: "rentals.list",
  moduleSlug: "rentals",
  title: "Rentals / Booking — List",
  path: "/partner/[partnerId]/rentals",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every RentalAgreement (Prisma-backed) booking for the rentals module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view. See src/lib/rentals.ts for the RentalAsset/RentalAgreement data-access layer.",
  sourceFile: "src/app/partner/[partnerId]/rentals/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "assetName", label: "Asset / Venue Name", type: "text" },
  { key: "renter", label: "Renter", type: "text" },
  { key: "bookingStart", label: "Booking Start", type: "date" },
  { key: "bookingEnd", label: "Booking End", type: "date" },
  { key: "depositAmount", label: "Deposit Amount", type: "currency" },
  { key: "rentalAmount", label: "Rental Amount", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export default async function RentalsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const agreements = await listAgreements(params.partnerId);
  const rows: Row[] = agreements.map((a) => ({
    id: a.id,
    assetName: a.assetName,
    renter: a.renter,
    bookingStart: a.bookingStart.toISOString(),
    bookingEnd: a.bookingEnd.toISOString(),
    depositAmount: a.depositAmount / 100,
    rentalAmount: a.rentalAmount / 100,
    status: a.status,
  }));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Rentals / Booking"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/rentals/new`} className="btn-accent">
          + New Booking
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RentalsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
