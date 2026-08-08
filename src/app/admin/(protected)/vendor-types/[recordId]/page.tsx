import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  getVendorTypeRecord,
  getVendorTypeDetailFields,
  getVendorTypeTimeline,
  vendorTypeRelated,
} from "@/lib/sample-data/vendor-types";

registerPage({
  id: "platform.vendor-types.detail",
  moduleSlug: "platform",
  title: "Vendor Types — Detail",
  path: "/admin/vendor-types/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Vendor Type, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/vendor-types/[recordId]/page.tsx",
});

export default function VendorTypeDetailPage({ params }: { params: { recordId: string } }) {
  const record = getVendorTypeRecord(params.recordId);
  const fields = getVendorTypeDetailFields(record);
  const timeline = getVendorTypeTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Vendor Types</h1>
        </div>
        <div className="p-6">
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={vendorTypeRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Vendor Type detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/admin/vendor-types" className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/admin/vendor-types/${params.recordId}/edit`} className="btn-outline">
                    Edit
                  </Link>
                  <ConfirmDeleteDialog recordLabel={recordLabel} />
                </div>
              </div>
            }
          />
        </div>
      </div>
    </SuperAdminGate>
  );
}
