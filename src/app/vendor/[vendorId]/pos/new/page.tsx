import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { posFormFields } from "@/lib/sample-data/pos";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "pos.create",
  moduleSlug: "pos",
  title: "POS — Create",
  path: "/vendor/[vendorId]/pos/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new sale in the pos module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/pos/new/page.tsx",
});

export default async function NewPosPage() {
  const mod = await getModule("pos");
  const fields = await applyCustomizations("pos.create", posFormFields);

  return (
    <AppShell navGroups={await buildVendorNavGroups("pos")} topbarTitle={`New Sale — ${mod?.label ?? "POS"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Sale</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new sale record for POS.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Sale" />
        </div>
      </div>
    </AppShell>
  );
}
