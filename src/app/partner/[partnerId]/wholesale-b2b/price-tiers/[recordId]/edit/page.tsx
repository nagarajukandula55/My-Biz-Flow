import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { priceTierFormFields, priceTierToRow } from "@/lib/sample-data/priceTiers";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getPriceTier } from "@/lib/wholesaleData";
import { updatePriceTierAction } from "../../actions";

registerPage({
  id: "wholesale-b2b.price-tiers.edit",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Price Tiers — Edit",
  path: "/partner/[partnerId]/wholesale-b2b/price-tiers/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing PriceTier's real data.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/price-tiers/[recordId]/edit/page.tsx",
});

export default async function EditPriceTierPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const tier = await getPriceTier(params.partnerId, params.recordId);
  if (!tier) notFound();
  const fields = await applyCustomizations("wholesale-b2b.price-tiers.edit", priceTierFormFields);
  const row = priceTierToRow(tier);

  return (
    <AppShell topbarTitle="Edit Price Tier — Wholesale B2B">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Price Tier</h1>
        <p className="mt-1 text-sm text-text-muted">{tier.name}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={row}
            submitLabel="Save changes"
            action={updatePriceTierAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
