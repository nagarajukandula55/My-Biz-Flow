import { SuperAdminGate } from "@/components/SuperAdminGate";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { planFormFields } from "@/lib/sample-data/plans";

registerPage({
  id: "platform.plans.create",
  moduleSlug: "platform",
  title: "Plans — Create",
  path: "/admin/plans/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new subscription Plan. Demo stub, no backend wired up.",
  sourceFile: "src/app/admin/plans/new/page.tsx",
});

export default function NewPlanPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center gap-2 border-b border-border bg-bg-raised px-6 py-4">
          <LogoMark size={20} />
          <h1 className="font-display text-lg font-bold text-text">New Plan</h1>
        </div>
        <div className="p-6">
          <RecordForm fields={planFormFields} submitLabel="Create Plan" />
        </div>
      </div>
    </SuperAdminGate>
  );
}
