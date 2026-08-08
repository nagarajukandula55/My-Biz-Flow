import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { loyaltyRewardsFormFields } from "@/lib/sample-data/loyalty-rewards";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "loyalty-rewards.create",
  moduleSlug: "loyalty-rewards",
  title: "Loyalty & Rewards — Create",
  path: "/vendor/[vendorId]/loyalty-rewards/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new member in the loyalty-rewards module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/loyalty-rewards/new/page.tsx",
});

export default async function NewLoyaltyRewardsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("loyalty-rewards");
  const fields = await applyCustomizations("loyalty-rewards.create", loyaltyRewardsFormFields);

  return (
    <AppShell topbarTitle={`New Member — ${mod?.label ?? "Loyalty & Rewards"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Member</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new member record for Loyalty & Rewards.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Member" />
        </div>
      </div>
    </AppShell>
  );
}
