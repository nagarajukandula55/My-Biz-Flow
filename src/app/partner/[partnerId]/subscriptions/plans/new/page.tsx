import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { BILLING_CYCLES } from "@/lib/subscriptions";
import { createPlanAction } from "../actions";

registerPage({
  id: "subscriptions.plans.create",
  moduleSlug: "subscriptions",
  title: "Subscriptions — New Plan",
  path: "/partner/[partnerId]/subscriptions/plans/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creates a new SubscriptionPlan (Prisma-backed) — name, billing cycle, plan amount, active flag — so Subscribers can be enrolled against it.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/plans/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Plan Name", type: "text", required: true },
  { key: "billingCycle", label: "Billing Cycle", type: "select", required: true, options: BILLING_CYCLES },
  { key: "planAmountRupees", label: "Plan Amount", type: "currency", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function NewSubscriptionPlanPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");

  return (
    <AppShell topbarTitle={`New Plan — ${mod?.label ?? "Subscriptions / Membership"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Plan</h1>
        <p className="mt-1 text-sm text-text-muted">Add a plan to this partner's subscription catalog.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ isActive: true }}
            submitLabel="Create Plan"
            action={createPlanAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
