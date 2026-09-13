import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getScProfileDetailFields,
  getScProfileTimeline,
  scProfileRelated,
  scProfileColumns,
} from "@/lib/sample-data/service-centre-sc-profile";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.sc-profile.detail",
  moduleSlug: "service-centre",
  title: "SC Profiles — Detail",
  path: "/partner/[partnerId]/service-centre/sc-profile/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single SC profile, including onboarding lifecycle status, GST/PAN, bank payout details, service area/radius and KYC/agreement doc refs.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/sc-profile/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScProfileDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-sc-profile", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.sc-profile.detail",
    getScProfileDetailFields(record),
    scProfileColumns
  );
  const timeline = getScProfileTimeline(record);
  const recordLabel = String(record["businessName"] ?? params.recordId);

  return (
    <AppShell topbarTitle="SC Profiles">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={scProfileRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">SC profile detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/service-centre/sc-profile`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/sc-profile/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
