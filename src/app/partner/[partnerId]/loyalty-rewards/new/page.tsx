import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { loyaltyRewardsFormFields } from "@/lib/sample-data/loyalty-rewards";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createLoyaltyMemberAction } from "../actions";

registerPage({
  id: "loyalty-rewards.create",
  moduleSlug: "loyalty-rewards",
  title: "Loyalty & Rewards — Create",
  path: "/partner/[partnerId]/loyalty-rewards/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new LoyaltyMember, built from the module's real field set via the shared RecordForm component. Submission creates a real LoyaltyMember row (Prisma-backed) starting at 0 points / Bronze tier — points are only ever added via the detail page's Earn/Redeem actions.",
  sourceFile: "src/app/partner/[partnerId]/loyalty-rewards/new/page.tsx",
});

export default async function NewLoyaltyRewardsPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("loyalty-rewards");
  const fields = await applyCustomizations("loyalty-rewards.create", loyaltyRewardsFormFields);

  return (
    <AppShell topbarTitle={`New Member — ${mod?.label ?? "Loyalty & Rewards"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Member</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new member record for Loyalty & Rewards.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Member"
            action={createLoyaltyMemberAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
