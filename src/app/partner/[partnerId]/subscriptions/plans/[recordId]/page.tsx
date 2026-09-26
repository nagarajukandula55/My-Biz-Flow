import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getPlan, BILLING_CYCLES } from "@/lib/subscriptions";
import { updatePlanAction } from "../actions";

registerPage({
  id: "subscriptions.plans.edit",
  moduleSlug: "subscriptions",
  title: "Subscriptions — Edit Plan",
  path: "/partner/[partnerId]/subscriptions/plans/[recordId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit-in-place form (same RecordForm pattern as the Clinic Patient detail page) for an existing SubscriptionPlan — name, billing cycle, plan amount, active flag.",
  sourceFile: "src/app/partner/[partnerId]/subscriptions/plans/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "name", label: "Plan Name", type: "text", required: true },
  { key: "billingCycle", label: "Billing Cycle", type: "select", required: true, options: BILLING_CYCLES },
  { key: "planAmountRupees", label: "Plan Amount", type: "currency", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function SubscriptionPlanDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("subscriptions");
  const plan = await getPlan(params.partnerId, params.recordId);
  if (!plan) notFound();

  return (
    <AppShell topbarTitle={`${plan.name} — ${mod?.label ?? "Subscriptions / Membership"}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{plan.name}</h1>
            <p className="mt-1 text-xs text-text-muted">Plan detail</p>
          </div>
          <Link href={`/partner/${params.partnerId}/subscriptions/plans`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              name: plan.name,
              billingCycle: plan.billingCycle,
              planAmountRupees: plan.planAmount / 100,
              isActive: plan.isActive,
            }}
            submitLabel="Save changes"
            action={updatePlanAction.bind(null, params.partnerId, plan.id)}
          />
        </div>
      </div>
    </AppShell>
  );
}
