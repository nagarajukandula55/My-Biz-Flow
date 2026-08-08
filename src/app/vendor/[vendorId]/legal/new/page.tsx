import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { legalFormFields } from "@/lib/sample-data/legal";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "legal.create",
  moduleSlug: "legal",
  title: "Legal / Case Management — Create",
  path: "/vendor/[vendorId]/legal/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new matter in the legal module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/legal/new/page.tsx",
});

export default async function NewLegalPage() {
  const mod = await getModule("legal");
  const fields = await applyCustomizations("legal.create", legalFormFields);

  return (
    <AppShell navGroups={await buildVendorNavGroups("legal")} topbarTitle={`New Matter — ${mod?.label ?? "Legal / Case Management"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Matter</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new matter record for Legal / Case Management.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Matter" />
        </div>
      </div>
    </AppShell>
  );
}
