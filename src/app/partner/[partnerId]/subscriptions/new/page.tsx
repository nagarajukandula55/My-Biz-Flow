import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listPlans, BILLING_CYCLES } from "@/lib/subscriptions";
import { createSubscriberAction } from "../actions";

registerPage({
  id: "subscriptions.create",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Create",
  path: "/partner/[partnerId]/subscriptions/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new Subscriber (Prisma-backed) in the subscriptions module, built via the shared RecordForm component. Optionally links the new subscriber to an existing SubscriptionPlan; billing cycle/plan amount are otherwise entered directly as the subscriber's own snapshot values.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/new/page.tsx",
});

export default async function NewSubscriptionsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");
  const plans = await listPlans(params.partnerId);

  const fields: FormFieldDef[] = [
    { key: "memberName", label: "Member Name", type: "text", required: true },
    {
      key: "planId",
      label: "Plan (optional)",
      type: "select",
      required: false,
      options: plans.map((p) => p.id),
      optionLabels: Object.fromEntries(plans.map((p) => [p.id, p.name])),
    },
    { key: "billingCycle", label: "Billing Cycle", type: "select", required: true, options: BILLING_CYCLES },
    { key: "planAmountRupees", label: "Plan Amount", type: "currency", required: true },
    { key: "startDate", label: "Start Date", type: "date", required: false },
  ];

  return (
    <AppShell topbarTitle={`New Membership — ${mod?.label ?? "Subscriptions / Membership"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Membership</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new membership record for Subscriptions / Membership.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Membership"
            action={createSubscriberAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
