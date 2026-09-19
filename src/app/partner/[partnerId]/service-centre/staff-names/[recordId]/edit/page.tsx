import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scStaffNameFormFields } from "@/lib/sample-data/service-centre-staff-names";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.staff-names.edit",
  moduleSlug: "service-centre",
  title: "Staff Names — Edit",
  path: "/partner/[partnerId]/service-centre/staff-names/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation:
    "Rename a staff name or set it Inactive. Deactivating stops the name being suggested on new workorders without touching the jobs it already appears on — a name field on a closed job is a historical record of who did the work, not a foreign key.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff-names/[recordId]/edit/page.tsx",
});

export default async function EditScStaffNamePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-staff-names", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.staff-names.edit", scStaffNameFormFields);

  return (
    <AppShell topbarTitle="Edit Staff Name">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Staff Name</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["name"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={(values: Record<string, unknown>) => updateBusinessRecordAction(params.partnerId, "service-centre-staff-names", params.recordId, values, "service-centre/staff-names")}
          />
        </div>
      </div>
    </AppShell>
  );
}
