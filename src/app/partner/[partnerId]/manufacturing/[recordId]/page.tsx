import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getManufacturingDetailFields, getManufacturingTimeline, manufacturingRelated, manufacturingColumns, extractProductionFromRecord } from "@/lib/sample-data/manufacturing";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { ProductionLifecycle } from "./ProductionLifecycle";

registerPage({
  id: "manufacturing.detail",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Detail",
  path: "/partner/[partnerId]/manufacturing/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single work order, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The ProductionLifecycle panel above it carries the real domain logic: BOM-line raw-material consumption against this partner's own live Material Catalog, a Planned -> Raw Material Issued -> In Production -> QC -> Completed stage stepper, and stock deduction + finished-good stock creation + labor-cost costing on Complete Production.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ManufacturingDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("manufacturing");
  const record = await getBusinessRecord(params.partnerId, "manufacturing", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("manufacturing.detail", getManufacturingDetailFields(record), manufacturingColumns);
  const timeline = getManufacturingTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const production = extractProductionFromRecord(record);
  const bomRecords = await listBusinessRecords(params.partnerId, "inventory-bom");
  const bomMaterials = bomRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({
      id: String(r["id"]),
      label: `${r["id"]} — ${r["description"] ?? ""}`,
      rate: Number(r["rate"] ?? 0),
    }));

  return (
    <AppShell topbarTitle={mod?.label ?? "Manufacturing / Production"}>
      <div>
        <ProductionLifecycle
          partnerId={params.partnerId}
          workOrderId={recordLabel}
          initialStage={production.stage}
          initialBomLines={production.bomLines}
          quantityPlanned={Number(record["quantityPlanned"] ?? 0) || undefined}
          bomMaterials={bomMaterials}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={manufacturingRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Work Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/manufacturing`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/manufacturing/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="manufacturing" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
