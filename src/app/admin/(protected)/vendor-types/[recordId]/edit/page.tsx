import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { vendorTypeFormFields, getVendorTypeRecord } from "@/lib/sample-data/vendor-types";

registerPage({
  id: "platform.vendor-types.edit",
  moduleSlug: "platform",
  title: "Vendor Types — Edit",
  path: "/admin/vendor-types/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Vendor Type (demo stub, no persistence yet).",
  sourceFile: "src/app/admin/(protected)/vendor-types/[recordId]/edit/page.tsx",
});

export default function EditVendorTypePage({ params }: { params: { recordId: string } }) {
  const record = getVendorTypeRecord(params.recordId);
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Vendor Type</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{String(record["id"])}</p>
          <RecordForm fields={vendorTypeFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </SuperAdminGate>
  );
}
