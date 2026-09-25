import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { priceTierFormFields } from "@/lib/sample-data/priceTiers";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createPriceTierAction } from "../actions";

registerPage({
  id: "wholesale-b2b.price-tiers.create",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Price Tiers — Create",
  path: "/partner/[partnerId]/wholesale-b2b/price-tiers/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "Creation form for a new PriceTier, Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/price-tiers/new/page.tsx",
});

export default async function NewPriceTierPage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("wholesale-b2b.price-tiers.create", priceTierFormFields);

  return (
    <AppShell topbarTitle="New Price Tier — Wholesale B2B">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Price Tier</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new bulk-discount price tier.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Price Tier"
            action={createPriceTierAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
