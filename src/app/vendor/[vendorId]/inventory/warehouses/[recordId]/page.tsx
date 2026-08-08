import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { getWarehouseRecord, getWarehouseDetailFields, getWarehouseTimeline, warehouseRelated, warehouseColumns } from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.warehouses.detail",
  moduleSlug: "inventory",
  title: "Warehouses — Detail",
  path: "/vendor/[vendorId]/inventory/warehouses/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single warehouse, rendered via the shared RecordDetail component.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/warehouses/[recordId]/page.tsx",
});

export default async function WarehousesDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getWarehouseRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("inventory.warehouses.detail", getWarehouseDetailFields(record), warehouseColumns);
  const timeline = getWarehouseTimeline();
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Warehouses">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={warehouseRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Warehouse detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/inventory/warehouses`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/inventory/warehouses/${params.recordId}/edit`} className="btn-outline">
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
