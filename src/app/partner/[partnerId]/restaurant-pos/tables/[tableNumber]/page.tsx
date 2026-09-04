import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { restaurantMenuItems } from "@/lib/sample-data/restaurant-pos";
import { findOpenOrderForTable } from "../../actions";
import { TableOrderCart } from "./TableOrderCart";

registerPage({
  id: "restaurant-pos.table-order",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — Table Order",
  path: "/partner/[partnerId]/restaurant-pos/tables/[tableNumber]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A single table's live order screen: add/remove menu items while the table is open, 'Send to Kitchen' locks the current lines as KOT-sent (so new additions are visibly separate from what the kitchen already has), and 'Settle Bill' recomputes totals server-side, creates a real Billing invoice (or one per cover for a split bill), and frees the table.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/tables/[tableNumber]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function TableOrderPage({
  params,
}: {
  params: { partnerId: string; tableNumber: string };
}) {
  const mod = await getModule("restaurant-pos");
  const order = await findOpenOrderForTable(params.partnerId, params.tableNumber);

  return (
    <AppShell topbarTitle={`${mod?.label ?? "Restaurant POS"} — ${params.tableNumber}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{params.tableNumber}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {order ? `Order ${order.id} · ${order.status}` : "No open order — add an item to start one."}
            </p>
          </div>
          <Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="btn-outline">
            &larr; Back to floor
          </Link>
        </div>
        <div className="mt-6">
          <TableOrderCart
            partnerId={params.partnerId}
            tableNumber={params.tableNumber}
            menuItems={restaurantMenuItems}
            order={order}
          />
        </div>
      </div>
    </AppShell>
  );
}
