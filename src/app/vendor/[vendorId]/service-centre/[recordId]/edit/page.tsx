import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { serviceCentreFormFields, getServiceCentreRecord } from "@/lib/sample-data/service-centre";

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
  explanation: "The same config-driven RecordForm pre-populated with an existing workorder's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/edit/page.tsx",
});

export default function EditServiceCentrePage({ params }: { params: { recordId: string } }) {
  const mod = getModule("service-centre");
  const record = getServiceCentreRecord(params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("service-centre")} topbarTitle={`Edit Workorder — ${mod?.label ?? "Service Centre"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Workorder</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={serviceCentreFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
