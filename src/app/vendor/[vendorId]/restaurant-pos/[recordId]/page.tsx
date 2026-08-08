import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getRestaurantPosDetailFields, getRestaurantPosTimeline, restaurantPosRelated, restaurantPosColumns } from "@/lib/sample-data/restaurant-pos";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "restaurant-pos.detail",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — Detail",
  path: "/vendor/[vendorId]/restaurant-pos/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single order, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/restaurant-pos/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantPosDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("restaurant-pos");
  const record = await getBusinessRecord(params.vendorId, "restaurant-pos", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("restaurant-pos.detail", getRestaurantPosDetailFields(record), restaurantPosColumns);
  const timeline = getRestaurantPosTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Restaurant POS"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={restaurantPosRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/restaurant-pos`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/restaurant-pos/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="restaurant-pos" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
