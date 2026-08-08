import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { subscriptionsFormFields, getSubscriptionsRecord } from "@/lib/sample-data/subscriptions";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "subscriptions.edit",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Edit",
  path: "/vendor/[vendorId]/subscriptions/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing membership's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/subscriptions/[recordId]/edit/page.tsx",
});

export default function EditSubscriptionsPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("subscriptions");
  const record = getSubscriptionsRecord(params.recordId);
  const fields = applyCustomizations("subscriptions.edit", subscriptionsFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("subscriptions")} topbarTitle={`Edit Membership — ${mod?.label ?? "Subscriptions / Membership"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Membership</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
