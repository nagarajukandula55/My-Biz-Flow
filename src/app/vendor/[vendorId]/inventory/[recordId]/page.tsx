import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getInventoryRecord, getInventoryDetailFields, getInventoryTimeline, inventoryRelated, inventoryColumns } from "@/lib/sample-data/inventory";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.detail",
  moduleSlug: "inventory",
  title: "Inventory / Warehouse — Detail",
  path: "/vendor/[vendorId]/inventory/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single stock item, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/[recordId]/page.tsx",
});

export default function InventoryDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("inventory");
  const record = getInventoryRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("inventory.detail", getInventoryDetailFields(record), inventoryColumns);
  const timeline = getInventoryTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("inventory")} topbarTitle={mod?.label ?? "Inventory / Warehouse"}>
      <div className="p-6">
        <Link
          href={`/vendor/${params.vendorId}/inventory`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Inventory / Warehouse
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={inventoryRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Stock Item detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/inventory/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <ConfirmDeleteDialog recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
