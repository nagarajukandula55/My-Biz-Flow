import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { wholesaleB2bFormFields } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createWholesaleOrderAction } from "../actions";

registerPage({
  id: "wholesale-b2b.create",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Create",
  path: "/partner/[partnerId]/wholesale-b2b/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new order in the wholesale-b2b module, built from the module's real field set via the shared RecordForm component. Submission recomputes tiered/bulk pricing from Quantity x List Price server-side and blocks the order if it would push the dealer's outstanding balance over their credit limit.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/new/page.tsx",
});

export default async function NewWholesaleB2bPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("wholesale-b2b");
  const fields = await applyCustomizations("wholesale-b2b.create", wholesaleB2bFormFields);

  return (
    <AppShell topbarTitle={`New Order — ${mod?.label ?? "Wholesale / Distributor B2B"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new order record for Wholesale / Distributor B2B.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Order"
            action={createWholesaleOrderAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
