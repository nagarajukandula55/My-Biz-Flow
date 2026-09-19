import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scStaffNameFormFields } from "@/lib/sample-data/service-centre-staff-names";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.staff-names.create",
  moduleSlug: "service-centre",
  title: "Staff Names — Create",
  path: "/partner/[partnerId]/service-centre/staff-names/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation:
    "Adds one name to the partner's Staff Names roster (name + optional role label + Active/Inactive). No credentials are collected because none exist — this list only feeds the suggestion lists on a workorder's Logged By / Engineer / Collected By fields.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff-names/new/page.tsx",
});

export default async function NewScStaffNamePage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.staff-names.create", "Staff Names");
  if (tierGate) return <AppShell topbarTitle={"New Staff Name"}>{tierGate}</AppShell>;

  const fields = await applyCustomizations("service-centre.staff-names.create", scStaffNameFormFields);

  return (
    <AppShell topbarTitle="New Staff Name">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Staff Name</h1>
        <p className="mt-1 text-xs text-text-muted">
          A name for the workorder paperwork — not a login account.
        </p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Add Name"
            action={(values: Record<string, unknown>) => createBusinessRecordAction(params.partnerId, "service-centre-staff-names", values, "service-centre/staff-names")}
          />
        </div>
      </div>
    </AppShell>
  );
}
