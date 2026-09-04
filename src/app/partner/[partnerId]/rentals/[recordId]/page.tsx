import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getRentalsDetailFields, getRentalsTimeline, rentalsRelated, rentalsColumns, extractRentalsLifecycle } from "@/lib/sample-data/rentals";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { RentalsLifecycle } from "./RentalsLifecycle";

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
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single booking, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The RentalsLifecycle panel above it carries the real domain logic: an Overdue badge (days-overdue count) when the return date has passed unreturned, and a Return Asset action that records a damage charge and computes refundableAmount server-side.",
  sourceFile: "src/app/partner/[partnerId]/rentals/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RentalsDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("rentals");
  const record = await getBusinessRecord(params.partnerId, "rentals", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("rentals.detail", getRentalsDetailFields(record), rentalsColumns);
  const timeline = getRentalsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractRentalsLifecycle(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "Rentals / Booking"}>
      <div>
        <RentalsLifecycle
          partnerId={params.partnerId}
          bookingId={recordLabel}
          bookingEnd={record["bookingEnd"] as string | undefined}
          depositAmount={lifecycle.depositAmount}
          status={record["status"] as string | undefined}
          returned={lifecycle.returned}
          refundableAmount={lifecycle.refundableAmount}
          damageCharge={lifecycle.damageCharge}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={rentalsRelated}
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
                <Link
                  href={`/partner/${params.partnerId}/rentals/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="rentals" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
