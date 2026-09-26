import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getSubscriber, listPlans, BILLING_CYCLES } from "@/lib/subscriptions";
import { updateSubscriberAction } from "../../actions";

registerPage({
  id: "subscriptions.edit",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Edit",
  path: "/partner/[partnerId]/subscriptions/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Subscriber's real data, letting a user edit member name, linked plan, billing cycle, plan amount, and start date.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/[recordId]/edit/page.tsx",
});

export default async function EditSubscriptionsPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");
  const subscriber = await getSubscriber(params.partnerId, params.recordId);
  if (!subscriber) notFound();
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
    <AppShell topbarTitle={`Edit Membership — ${mod?.label ?? "Subscriptions / Membership"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Membership</h1>
        <p className="mt-1 text-sm text-text-muted">{subscriber.memberName}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              memberName: subscriber.memberName,
              planId: subscriber.planId ?? "",
              billingCycle: subscriber.billingCycle,
              planAmountRupees: subscriber.planAmount / 100,
              startDate: subscriber.startDate ? subscriber.startDate.toISOString().slice(0, 10) : "",
            }}
            submitLabel="Save changes"
            action={updateSubscriberAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
