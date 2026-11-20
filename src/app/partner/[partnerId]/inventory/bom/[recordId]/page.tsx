import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getBomDetailFields, getBomTimeline, bomRelated, bomColumns } from "@/lib/sample-data/bom";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getPageTierAccess } from "@/lib/tenant";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { getBarcodeSettings } from "@/lib/barcodeCatalog";
import { MaterialBarcodeActions } from "../../barcodes/MaterialBarcodeActions";
import { UnitBarcodeGenerator } from "../../barcodes/UnitBarcodeGenerator";
import { VariantCreator } from "../../barcodes/VariantCreator";

registerPage({
  id: "inventory.bom.detail",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — Detail",
  path: "/partner/[partnerId]/inventory/bom/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single material catalog entry, rendered via the shared RecordDetail component.",
  sourceFile: "src/app/partner/[partnerId]/inventory/bom/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BomDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-bom", params.recordId);
  if (!record) notFound();
  const hasPos = (await getVisibleModuleSlugs(params.partnerId)).includes("pos");
  const barcodeFeatureEnabled = hasPos && (await getPageTierAccess(params.partnerId, "inventory.barcodes")).allowed;
  const [fields, barcodeSettings] = await Promise.all([
    applyCustomizationsToDetailFields("inventory.bom.detail", getBomDetailFields(record), bomColumns),
    getBarcodeSettings(params.partnerId),
  ]);
  const visibleFields = fields.filter((field) => barcodeFeatureEnabled || !["Barcode (SKU)", "Barcode Type", "Variant / Colour / Style", "Pack Size / Net Quantity", "Offer / Sale Price", "Manufactured On", "Expiry / Best Before", "Label Note"].includes(String(field.label)));
  const timeline = getBomTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Material Catalog (BOM)">
      <div>
        <RecordDetail
          fields={visibleFields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={bomRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Material detail</p>
              </div>
              <div className="flex items-center gap-3">
                {barcodeFeatureEnabled && <div><MaterialBarcodeActions partnerId={params.partnerId} material={record} settings={barcodeSettings} /><UnitBarcodeGenerator partnerId={params.partnerId} material={record} settings={barcodeSettings} /><VariantCreator partnerId={params.partnerId} materialId={params.recordId} /></div>}
                <Link href={`/partner/${params.partnerId}/inventory/bom`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/inventory/bom/${params.recordId}/edit`} className="btn-outline">
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
