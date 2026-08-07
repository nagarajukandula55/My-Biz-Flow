import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { loyaltyRewardsFormFields, getLoyaltyRewardsRecord } from "@/lib/sample-data/loyalty-rewards";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "loyalty-rewards.edit",
  moduleSlug: "loyalty-rewards",
  title: "Loyalty & Rewards — Edit",
  path: "/vendor/[vendorId]/loyalty-rewards/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing member's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/loyalty-rewards/[recordId]/edit/page.tsx",
});

export default function EditLoyaltyRewardsPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("loyalty-rewards");
  const record = getLoyaltyRewardsRecord(params.recordId);
  const fields = applyCustomizations("loyalty-rewards.edit", loyaltyRewardsFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("loyalty-rewards")} topbarTitle={`Edit Member — ${mod?.label ?? "Loyalty & Rewards"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Member</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
