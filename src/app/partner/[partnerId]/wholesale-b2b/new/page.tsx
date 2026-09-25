import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { WholesaleOrderNewForm } from "../WholesaleOrderNewForm";
import { listWholesaleCustomers, listPriceTiers } from "@/lib/wholesaleData";

registerPage({
  id: "wholesale-b2b.create",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Create",
  path: "/partner/[partnerId]/wholesale-b2b/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creation form for a new WholesaleOrder: pick a Customer and optional Price Tier, then add line items via the shared MaterialLineItemsTable. Submission recomputes the (possibly tier-discounted) total server-side and blocks the order if it would push the customer's outstanding balance over their credit limit.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/new/page.tsx",
});

export default async function NewWholesaleB2bPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("wholesale-b2b");
  const [customers, priceTiers] = await Promise.all([
    listWholesaleCustomers(params.partnerId),
    listPriceTiers(params.partnerId),
  ]);

  return (
    <AppShell topbarTitle={`New Order — ${mod?.label ?? "Wholesale / Distributor B2B"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new order record for Wholesale / Distributor B2B.</p>
        <div className="mt-6">
          <WholesaleOrderNewForm
            partnerId={params.partnerId}
            customers={customers.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
            priceTiers={priceTiers.map((t) => ({ id: t.id, name: t.name, discountPercent: t.discountPercent }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
