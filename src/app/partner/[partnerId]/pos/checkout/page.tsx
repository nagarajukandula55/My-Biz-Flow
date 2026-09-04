import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { listBusinessRecords } from "@/lib/businessRecords";
import { PosCheckout } from "./PosCheckout";

registerPage({
  id: "pos.checkout",
  moduleSlug: "pos",
  title: "POS — Checkout",
  path: "/partner/[partnerId]/pos/checkout",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The real till: a multi-item cart built by searching/scanning this partner's own live Inventory > Stock, server-computed subtotal/tax/discount/total (never trusted from the client), multi-tender payment capture (supports a split payment), and on completion — stock deduction against Inventory (blocked if insufficient, no partial deduction) plus a real Billing invoice creation, mirroring the Service Centre workorder-close invoice flow. Replaces the old single-product generic-form 'New Sale' page.",
  sourceFile: "src/app/partner/[partnerId]/pos/checkout/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PosCheckoutPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("pos");
  const [stockRecords, materialRecords] = await Promise.all([
    listBusinessRecords(params.partnerId, "inventory-stock"),
    listBusinessRecords(params.partnerId, "inventory-bom"),
  ]);
  const materialById = new Map(materialRecords.map((m) => [String(m["id"]), m]));
  const stockItems = stockRecords
    .filter((r) => Number(r["quantityOnHand"] ?? 0) > 0)
    .map((r) => {
      const material = materialById.get(String(r["id"]));
      return {
        sku: String(r["id"]),
        label: String(r["itemName"] ?? r["id"]),
        // Prefer the Material Catalog's real sale rate/tax when this stock item
        // has a matching entry there; fall back to unit cost + a standard GST
        // rate for stock items that aren't in the BOM catalog (e.g. pure retail
        // goods a Service Centre partner never needed to define as a "material").
        unitPrice: Number(material?.["rate"] ?? r["unitCost"] ?? 0),
        taxRate: Number(material?.["taxPercent"] ?? 18),
        available: Number(r["quantityOnHand"] ?? 0),
      };
    });

  return (
    <AppShell topbarTitle={`New Sale — ${mod?.label ?? "POS"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Sale</h1>
        <p className="mt-1 text-sm text-text-muted">
          Add products to the cart, take payment, complete the sale. Stock deducts and a Billing invoice is
          created automatically.
        </p>
        {stockItems.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No stocked products available — add items in Inventory &gt; Stock first.
          </p>
        ) : (
          <div className="mt-6">
            <PosCheckout partnerId={params.partnerId} stockItems={stockItems} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
