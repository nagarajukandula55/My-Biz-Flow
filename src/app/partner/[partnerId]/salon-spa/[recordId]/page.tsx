import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getSalonSpaDetailFields, getSalonSpaTimeline, salonSpaRelated, salonSpaColumns } from "@/lib/sample-data/salon-spa";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { SalonSpaLifecycle } from "./SalonSpaLifecycle";

registerPage({
  id: "salon-spa.detail",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — Detail",
  path: "/partner/[partnerId]/salon-spa/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
    { key: "completion-panel", label: "Completion, commission & billing panel" },
  ],
  explanation: "Read-only detail view of a single booking, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. Real data — Prisma-backed (BusinessRecord table). The SalonSpaLifecycle panel above it marks the booking Completed (computing the stylist's commission amount server-side from price x commissionPercent) and creates a real Billing invoice for the service price from there.",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SalonSpaDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("salon-spa");
  const record = await getBusinessRecord(params.partnerId, "salon-spa", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("salon-spa.detail", getSalonSpaDetailFields(record), salonSpaColumns);
  const timeline = getSalonSpaTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Salon & Spa"}>
      <div>
        <SalonSpaLifecycle
          partnerId={params.partnerId}
          recordId={recordLabel}
          initialStatus={String(record["status"] ?? "Booked")}
          price={Number(record["price"] ?? 0)}
          commissionPercent={Number(record["commissionPercent"] ?? 0)}
          initialCommissionAmount={record["commissionAmount"] ? Number(record["commissionAmount"]) : undefined}
          invoiceId={record["invoiceId"] ? String(record["invoiceId"]) : undefined}
        />

        <div className="mt-6">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={salonSpaRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Booking detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/salon-spa`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/salon-spa/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  partnerId={params.partnerId}
                  moduleSlug="salon-spa"
                  recordKey={params.recordId}
                  recordLabel={recordLabel}
                />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
