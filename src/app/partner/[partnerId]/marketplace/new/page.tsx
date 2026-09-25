import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { marketplaceListingFormFields } from "@/lib/sample-data/marketplaceListings";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createMarketplaceListingAction } from "../actions";

registerPage({
  id: "marketplace.create",
  moduleSlug: "marketplace",
  title: "Marketplace — Listings — Create",
  path: "/partner/[partnerId]/marketplace/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "A config-driven creation form for a new MarketplaceListing (this partner's own product listing), Prisma-backed via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/new/page.tsx",
});

export default async function NewMarketplacePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("marketplace");
  const fields = await applyCustomizations("marketplace.create", marketplaceListingFormFields);

  return (
    <AppShell topbarTitle={`New Listing — ${mod?.label ?? "Marketplace / Partner Aggregator"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Listing</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new product listing for Marketplace / Partner Aggregator.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Listing"
            action={createMarketplaceListingAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
