import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getInquiryDetailFields,
  getInquiryTimeline,
  inquiryRelated,
  inquiryColumns,
} from "@/lib/sample-data/service-centre-inquiry";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { InquiryLifecycle } from "./InquiryLifecycle";

registerPage({
  id: "service-centre.inquiries.detail",
  moduleSlug: "service-centre",
  title: "Inquiries — Detail",
  path: "/partner/[partnerId]/service-centre/inquiries/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation:
    "Detail view of a single inquiry with its lifecycle actions (InquiryLifecycle.tsx): an Open inquiry can be converted to a real workorder or closed with a standardised reason; a Converted/Closed inquiry is read-only from here on.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/inquiries/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-inquiry", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.inquiries.detail",
    getInquiryDetailFields(record),
    inquiryColumns
  );
  const timeline = getInquiryTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Inquiries">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={inquiryRelated}
          headerSlot={
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">
                    {String(record["customerName"] ?? recordLabel)} — {recordLabel}
                  </h1>
                  <p className="mt-1 text-xs text-text-muted">Inquiry detail</p>
                </div>
                <Link href={`/partner/${params.partnerId}/service-centre/inquiries`} className="btn-outline">
                  &larr; Back
                </Link>
              </div>
              <InquiryLifecycle partnerId={params.partnerId} inquiryId={params.recordId} record={record} />
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
