import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scVendorProfileFormFields } from "@/lib/sample-data/service-centre-vendor-profile";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.vendor-profile.edit",
  moduleSlug: "service-centre",
  title: "Vendor Profiles — Edit",
  path: "/partner/[partnerId]/service-centre/vendor-profile/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing vendor profile's data, letting a user edit and save changes — including advancing the onboarding status.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/vendor-profile/[recordId]/edit/page.tsx",
});

export default async function EditScVendorProfilePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-vendor-profile", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.vendor-profile.edit", scVendorProfileFormFields);

  return (
    <AppShell topbarTitle="Edit Vendor Profile">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Vendor Profile</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["businessName"] ?? record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "service-centre-vendor-profile", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
