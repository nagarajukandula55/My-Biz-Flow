import { SuperAdminGate } from "@/components/SuperAdminGate";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { planFormFields, getPlanRecord } from "@/lib/sample-data/plans";

registerPage({
  id: "platform.plans.edit",
  moduleSlug: "platform",
  title: "Plans — Edit",
  path: "/admin/plans/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Plan — price and included modules (demo stub, no persistence yet).",
  sourceFile: "src/app/admin/plans/[recordId]/edit/page.tsx",
});

export default function EditPlanPage({ params }: { params: { recordId: string } }) {
  const record = getPlanRecord(params.recordId);
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center gap-2 border-b border-border bg-bg-raised px-6 py-4">
          <LogoMark size={20} />
          <h1 className="font-display text-lg font-bold text-text">Edit Plan</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{String(record["name"])}</p>
          <RecordForm fields={planFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </SuperAdminGate>
  );
}
