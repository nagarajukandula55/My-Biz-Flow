import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getPosRecord, getPosDetailFields, getPosTimeline, posRelated, posColumns } from "@/lib/sample-data/pos";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "pos.detail",
  moduleSlug: "pos",
  title: "POS — Detail",
  path: "/vendor/[vendorId]/pos/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single sale, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/pos/[recordId]/page.tsx",
});

export default function PosDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("pos");
  const record = getPosRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("pos.detail", getPosDetailFields(record), posColumns);
  const timeline = getPosTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("pos")} topbarTitle={mod?.label ?? "POS"}>
      <div className="p-6">
        <Link
          href={`/vendor/${params.vendorId}/pos`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to POS
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={posRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Sale detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/pos/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/pos/${params.recordId}/edit`}
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
