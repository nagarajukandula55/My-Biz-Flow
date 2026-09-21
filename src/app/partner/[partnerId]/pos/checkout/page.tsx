import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePosStaff } from "@/lib/pos/posAuth";
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
    "The real till: a multi-item cart built by searching/scanning this partner's own live Inventory > Stock, server-computed subtotal/tax/discount/total (never trusted from the client), multi-tender payment capture (supports a split payment), and on completion — stock deduction against Inventory (blocked if insufficient, no partial deduction) plus a real Billing invoice creation, mirroring the Service Centre workorder-close invoice flow. Gated behind POS's own staff login — the Cashier field is the logged-in staff member's real name/staff code, not free text.",
  sourceFile: "src/app/partner/[partnerId]/pos/checkout/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PosCheckoutPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { locationId?: string };
}) {
  const staff = await requirePosStaff(params.partnerId);
  const mod = await getModule("pos");
  const [stockRecords, materialRecords, locationRecords] = await Promise.all([
    listBusinessRecords(params.partnerId, "inventory-stock"),
    listBusinessRecords(params.partnerId, "inventory-bom"),
    listBusinessRecords(params.partnerId, "brand"),
  ]);
  const materialById = new Map(materialRecords.map((m) => [String(m["id"]), m]));

  // Outlet = a Brand > Location row for this partner (same entity Service
  // Centre's sub-centres already use), mapped to a real Inventory warehouse
  // via its own `mappedWarehouse` field. Selling out of a warehouse the
  // chosen outlet ISN'T mapped to would let a cashier sell stock that's
  // physically sitting in a different outlet's store room.
  const outlets = locationRecords.filter((r) => (r["status"] ?? "Active") === "Active" && r["mappedWarehouse"]);
  const selectedLocation =
    outlets.find((r) => String(r["id"]) === searchParams?.locationId) ?? outlets[0];
  const selectedWarehouse = selectedLocation ? String(selectedLocation["mappedWarehouse"]) : null;

  const stockItems = stockRecords
    // Defective stock (see src/lib/inventoryStock.ts's rowCondition()) is
    // never sellable — a row with no `condition` value predates the field
    // and is Good, same convention every other condition-aware read uses.
    // Also scoped to the selected outlet's own mapped warehouse only — a
    // material sitting in a different outlet's warehouse isn't sellable
    // from here.
    .filter(
      (r) =>
        r["condition"] !== "Defective" &&
        Number(r["qtyOnHand"] ?? 0) > 0 &&
        (!selectedWarehouse || r["warehouseName"] === selectedWarehouse)
    )
    .map((r) => {
      const materialCode = String(r["materialId"] ?? "").split(" — ")[0].trim();
      const material = materialById.get(materialCode);
      return {
        sku: String(r["id"]),
        label: String(r["materialId"] ?? r["id"]),
        // Prefer the Material Catalog's real sale rate/tax when this stock item
        // has a matching entry there; fall back to unit cost + a standard GST
        // rate for stock items that aren't in the BOM catalog (e.g. pure retail
        // goods a Service Centre partner never needed to define as a "material").
        unitPrice: Number(material?.["rate"] ?? r["unitCost"] ?? 0),
        taxRate: Number(material?.["taxPercent"] ?? 18),
        available: Number(r["qtyOnHand"] ?? 0),
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

        {outlets.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No outlet is set up yet — create a Location under Brand and map it to a Warehouse (Mapped Warehouse
            field) before selling.
          </p>
        ) : (
          <>
            <form method="get" className="mt-4 flex items-end gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Outlet
                <select
                  name="locationId"
                  defaultValue={selectedLocation ? String(selectedLocation["id"]) : ""}
                  className="mt-1 block w-64 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
                >
                  {outlets.map((o) => (
                    <option key={String(o["id"])} value={String(o["id"])}>
                      {String(o["locationName"])} ({String(o["mappedWarehouse"])})
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-outline">
                Switch Outlet
              </button>
            </form>

            {stockItems.length === 0 ? (
              <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No stocked products available at this outlet's warehouse — add items in Inventory &gt; Stock first.
              </p>
            ) : (
              <div className="mt-6">
                <PosCheckout
                  partnerId={params.partnerId}
                  stockItems={stockItems}
                  cashier={`${staff.name} (${staff.staffCode})`}
                  branch={selectedLocation ? String(selectedLocation["locationName"]) : undefined}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
