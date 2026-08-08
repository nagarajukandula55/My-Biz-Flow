import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getScBrandRecord,
  getScBrandDetailFields,
  getScBrandTimeline,
  scBrandRelated,
  scBrandColumns,
} from "@/lib/sample-data/service-centre-brands";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.brands.detail",
  moduleSlug: "service-centre",
  title: "Device Brands — Detail",
  path: "/vendor/[vendorId]/service-centre/brands/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single brand.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/brands/[recordId]/page.tsx",
});

export default async function ScBrandDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getScBrandRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.brands.detail",
    getScBrandDetailFields(record),
    scBrandColumns
  );
  const timeline = getScBrandTimeline(record);
  const recordLabel = String(record["name"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Device Brands">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={scBrandRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Brand detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/service-centre/brands`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/service-centre/brands/${params.recordId}/edit`}
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
