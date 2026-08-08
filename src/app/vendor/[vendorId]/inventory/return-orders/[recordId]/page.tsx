import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getReturnOrderDetailFields, getReturnOrderTimeline, returnOrderRelated, returnOrderColumns } from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "inventory.return-orders.detail",
  moduleSlug: "inventory",
  title: "Return Orders — Detail",
  path: "/vendor/[vendorId]/inventory/return-orders/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single return order (defective/good material back to the mapped warehouse), rendered via the shared RecordDetail component.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/return-orders/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ReturnOrdersDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "inventory-return-orders", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("inventory.return-orders.detail", getReturnOrderDetailFields(record), returnOrderColumns);
  const timeline = getReturnOrderTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Return Orders">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={returnOrderRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Return Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/inventory/return-orders`} className="btn-outline">
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
