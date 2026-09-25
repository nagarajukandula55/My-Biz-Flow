import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listMarketplaceListings, paiseToRupees } from "@/lib/marketplace";
import { MarketplaceOrderNewForm } from "../MarketplaceOrderNewForm";

registerPage({
  id: "marketplace.orders.create",
  moduleSlug: "marketplace",
  title: "Marketplace — Orders — Create",
  path: "/partner/[partnerId]/marketplace/orders/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creation form for a new MarketplaceOrder: pick one of this partner's own active listings, enter customer name/contact and quantity. totalAmount is computed server-side from the listing's own price x quantity (never trusted from the client), and the order is blocked outright if the listing doesn't have enough stock. Stock itself is not deducted yet at this stage — see the order detail page's status actions.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/orders/new/page.tsx",
});

export default async function NewMarketplaceOrderPage({ params }: { params: { partnerId: string } }) {
  const listings = await listMarketplaceListings(params.partnerId);

  return (
    <AppShell topbarTitle="New Order — Marketplace">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new order against one of your own Marketplace listings.</p>
        <div className="mt-6">
          <MarketplaceOrderNewForm
            partnerId={params.partnerId}
            listings={listings
              .filter((l) => l.isActive)
              .map((l) => ({ id: l.id, title: l.title, price: paiseToRupees(l.price), stockQuantity: l.stockQuantity }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
