import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getPartOrderDetailFields, getPartOrderTimeline, partOrderRelated, partOrderColumns } from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "inventory.part-orders.detail",
  moduleSlug: "inventory",
  title: "Part Orders — Detail",
  path: "/vendor/[vendorId]/inventory/part-orders/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single part order (warehouse dispatching replacement material), rendered via the shared RecordDetail component.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/part-orders/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartOrdersDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "inventory-part-orders", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("inventory.part-orders.detail", getPartOrderDetailFields(record), partOrderColumns);
  const timeline = getPartOrderTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Part Orders">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={partOrderRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Part Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/inventory/part-orders`} className="btn-outline">
                  &larr; Back
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
