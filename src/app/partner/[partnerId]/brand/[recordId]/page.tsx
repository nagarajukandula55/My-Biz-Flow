import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getBrandDetailFields, getBrandTimeline, brandRelated, brandColumns, computeBrandRollup, type AccessScope } from "@/lib/sample-data/brand";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { BrandLifecycle } from "./BrandLifecycle";

registerPage({
  id: "brand.detail",
  moduleSlug: "brand",
  title: "Brand — Detail",
  path: "/partner/[partnerId]/brand/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single location, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The BrandLifecycle panel above it carries the real domain logic: an aggregated performance rollup across every sibling location sharing this record's brand, and cross-location role assignment marking each of this partner's Users as brand-wide or single-location access.",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("brand");
  const record = await getBusinessRecord(params.partnerId, "brand", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("brand.detail", getBrandDetailFields(record), brandColumns);
  const timeline = getBrandTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const brandName = String(record["brandName"] ?? "");
  const allBrandRecords = await listBusinessRecords(params.partnerId, "brand");
  const rollup = computeBrandRollup(brandName, allBrandRecords);
  const userRecords = await listBusinessRecords(params.partnerId, "users");
  const users = userRecords.map((u) => ({
    id: String(u["id"]),
    accessScope: (u["accessScope"] as AccessScope) ?? "single-location",
  }));

  return (
    <AppShell topbarTitle={mod?.label ?? "Brand"}>
      <div>
        <BrandLifecycle
          partnerId={params.partnerId}
          brandRecordId={recordLabel}
          brandName={brandName}
          rollup={rollup}
          users={users}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={brandRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Location detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/brand`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/brand/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="brand" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
