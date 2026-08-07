import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { posFormFields } from "@/lib/sample-data/pos";

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

export default function NewPosPage() {
  const mod = getModule("pos");

  return (
    <AppShell navGroups={buildVendorNavGroups("pos")} topbarTitle={`New Sale — ${mod?.label ?? "POS"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Sale</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new sale record for POS.</p>
        <div className="mt-6">
          <RecordForm fields={posFormFields} submitLabel="Create Sale" />
        </div>
      </div>
    </AppShell>
  );
}
