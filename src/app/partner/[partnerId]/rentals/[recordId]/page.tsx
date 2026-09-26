import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail, type RecordField, type TimelineEntry } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAgreement } from "@/lib/rentals";
import { RentalsLifecycle } from "./RentalsLifecycle";
import { DeleteRentalAgreementButton } from "./DeleteRentalAgreementButton";

registerPage({
  id: "rentals.detail",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Detail",
  path: "/partner/[partnerId]/rentals/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single RentalAgreement booking (Prisma-backed), rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The RentalsLifecycle panel above it carries the real domain logic: an Overdue badge (days-overdue count) when the return date has passed unreturned, and a Return Asset action that records a damage charge and computes refundableAmount server-side.",
  sourceFile: "src/app/partner/[partnerId]/rentals/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "warning",
  Confirmed: "teal",
  Ongoing: "amber",
  Completed: "success",
  Cancelled: "danger",
};

export default async function RentalsDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const agreement = await getAgreement(params.partnerId, params.recordId);
  if (!agreement) notFound();

  const fields: RecordField[] = [
    { label: "Asset / Venue Name", value: agreement.assetName, type: "text" },
    { label: "Renter", value: agreement.renter, type: "text" },
    { label: "Booking Start", value: agreement.bookingStart.toISOString(), type: "date" },
    { label: "Booking End", value: agreement.bookingEnd.toISOString(), type: "date" },
    { label: "Deposit Amount", value: agreement.depositAmount / 100, type: "currency" },
    { label: "Rental Amount", value: agreement.rentalAmount / 100, type: "currency" },
    { label: "Status", value: agreement.status, type: "select", chipVariant: STATUS_VARIANT[agreement.status] ?? "neutral" },
  ];

  const timeline: TimelineEntry[] = [
    { id: "t1", label: "Booking created", timestamp: agreement.createdAt.toISOString(), actor: "Rentals Desk" },
    ...(agreement.returned && agreement.returnedAt
      ? [{ id: "t2", label: "Asset returned", timestamp: agreement.returnedAt.toISOString(), actor: "Rentals Desk" }]
      : []),
  ];

  const recordLabel = `${agreement.assetName} — ${agreement.renter}`;

  return (
    <AppShell topbarTitle={mod?.label ?? "Rentals / Booking"}>
      <div>
        <RentalsLifecycle
          partnerId={params.partnerId}
          bookingId={agreement.id}
          bookingEnd={agreement.bookingEnd.toISOString()}
          depositAmount={agreement.depositAmount / 100}
          status={agreement.status}
          returned={agreement.returned}
          refundableAmount={agreement.refundableAmount != null ? agreement.refundableAmount / 100 : undefined}
          damageCharge={agreement.damageCharge != null ? agreement.damageCharge / 100 : undefined}
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
                  <p className="mt-1 text-xs text-text-muted">Booking detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/partner/${params.partnerId}/rentals`} className="btn-outline">
                    &larr; Back
                  </Link>
                  {agreement.assetId && (
                    <Link href={`/partner/${params.partnerId}/rentals/assets/${agreement.assetId}`} className="btn-outline">
                      View Asset
                    </Link>
                  )}
                  <Link href={`/partner/${params.partnerId}/rentals/${params.recordId}/edit`} className="btn-outline">
                    Edit
                  </Link>
                  <DeleteRentalAgreementButton partnerId={params.partnerId} agreementId={agreement.id} label={recordLabel} />
                </div>
              </div>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
