import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getLegalRecord, getLegalDetailFields, getLegalTimeline, legalRelated } from "@/lib/sample-data/legal";

registerPage({
  id: "legal.detail",
  moduleSlug: "legal",
  title: "Legal / Case Management — Detail",
  path: "/vendor/[vendorId]/legal/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single matter, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/legal/[recordId]/page.tsx",
});

export default function LegalDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("legal");
  const record = getLegalRecord(params.recordId);
  const fields = getLegalDetailFields(record);
  const timeline = getLegalTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("legal")} topbarTitle={mod?.label ?? "Legal / Case Management"}>
      <div className="p-6">
        <Link
          href={`/vendor/${params.vendorId}/legal`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Legal / Case Management
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={legalRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Matter detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/legal/${params.recordId}/edit`}
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
