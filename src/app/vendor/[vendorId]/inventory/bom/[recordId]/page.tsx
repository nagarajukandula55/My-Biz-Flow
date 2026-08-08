import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getBomDetailFields, getBomTimeline, bomRelated, bomColumns } from "@/lib/sample-data/bom";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "inventory.bom.detail",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — Detail",
  path: "/vendor/[vendorId]/inventory/bom/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single material catalog entry, rendered via the shared RecordDetail component.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/bom/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BomDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "inventory-bom", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("inventory.bom.detail", getBomDetailFields(record), bomColumns);
  const timeline = getBomTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Material Catalog (BOM)">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={bomRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Material detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/inventory/bom`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/inventory/bom/${params.recordId}/edit`} className="btn-outline">
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
