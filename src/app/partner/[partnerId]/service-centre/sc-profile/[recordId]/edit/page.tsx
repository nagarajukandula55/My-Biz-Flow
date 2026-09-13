import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scProfileFormFields } from "@/lib/sample-data/service-centre-sc-profile";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.sc-profile.edit",
  moduleSlug: "service-centre",
  title: "SC Profiles — Edit",
  path: "/partner/[partnerId]/service-centre/sc-profile/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing SC profile's data, letting a user edit and save changes — including advancing the onboarding status.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/sc-profile/[recordId]/edit/page.tsx",
});

export default async function EditScProfilePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-sc-profile", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.sc-profile.edit", scProfileFormFields);

  return (
    <AppShell topbarTitle="Edit SC Profile">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit SC Profile</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["businessName"] ?? record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "service-centre-sc-profile", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
