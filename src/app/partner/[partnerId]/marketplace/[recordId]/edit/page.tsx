import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { marketplaceListingFormFields, marketplaceListingToRow } from "@/lib/sample-data/marketplaceListings";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getMarketplaceListing } from "@/lib/marketplace";
import { updateMarketplaceListingAction } from "../../actions";

registerPage({
  id: "marketplace.edit",
  moduleSlug: "marketplace",
  title: "Marketplace — Listings — Edit",
  path: "/partner/[partnerId]/marketplace/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing MarketplaceListing's real data, Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/[recordId]/edit/page.tsx",
});

export default async function EditMarketplacePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("marketplace");
  const listing = await getMarketplaceListing(params.partnerId, params.recordId);
  if (!listing) notFound();
  const fields = await applyCustomizations("marketplace.edit", marketplaceListingFormFields);
  const row = marketplaceListingToRow(listing);

  return (
    <AppShell topbarTitle={`Edit Listing — ${mod?.label ?? "Marketplace / Partner Aggregator"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Listing</h1>
        <p className="mt-1 text-sm text-text-muted">{listing.title}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={row}
            submitLabel="Save changes"
            action={updateMarketplaceListingAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
