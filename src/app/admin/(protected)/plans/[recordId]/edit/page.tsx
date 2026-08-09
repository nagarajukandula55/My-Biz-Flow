import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { planFormFields } from "@/lib/sample-data/plans";
import { getPlan } from "@/lib/plansData";
import { updatePlanAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.plans.edit",
  moduleSlug: "platform",
  title: "Plans — Edit",
  path: "/admin/plans/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Plan — price and included modules. Writes to the Plan Prisma table.",
  sourceFile: "src/app/admin/(protected)/plans/[recordId]/edit/page.tsx",
});

export default async function EditPlanPage({ params }: { params: { recordId: string } }) {
  const plan = await getPlan(params.recordId);
  if (!plan) notFound();
  const updateAction = updatePlanAction.bind(null, plan.id);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Plan</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{plan.name}</p>
          <RecordForm fields={planFormFields} initialValues={plan} submitLabel="Save changes" action={updateAction} />
        </div>
      </div>
    </SuperAdminGate>
  );
}
