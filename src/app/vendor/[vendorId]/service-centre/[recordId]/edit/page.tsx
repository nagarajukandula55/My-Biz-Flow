import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecordForm } from "@/components/RecordForm";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.edit",
  moduleSlug: "service-centre",
  title: "Service Centre — Edit",
  path: "/vendor/[vendorId]/service-centre/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing workorder's real base fields, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table. Note: this only covers the base fields (customer, device, technician, etc.); the workorder lifecycle (stage/parts/service lines) is separate, still sample-data-backed — see WorkorderLifecycle.tsx.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/edit/page.tsx",
});

export default async function EditServiceCentrePage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("service-centre");
  const record = await getBusinessRecord(params.vendorId, "service-centre", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.edit", serviceCentreFormFields);

  return (
    <AppShell topbarTitle={`Edit Workorder — ${mod?.label ?? "Service Centre"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Workorder</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "service-centre", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
