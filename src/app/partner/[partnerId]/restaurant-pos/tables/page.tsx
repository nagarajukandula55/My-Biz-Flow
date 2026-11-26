import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { StatusChip } from "@/components/StatusChip";
import { RecordForm } from "@/components/RecordForm";
import { OfflineReferenceCache } from "@/components/OfflineReferenceCache";
import { getRestaurantSettings, listOpenOrdersForPartner, listRestaurantMenuItems, listRestaurantTables } from "@/lib/restaurantPos/data";
import { activateRestaurantTableAction, deactivateRestaurantTableAction, restoreRestaurantTableAction } from "../actions";

registerPage({
  id: "restaurant-pos.tables",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS - Table Floor",
  path: "/partner/[partnerId]/restaurant-pos/tables",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "table-inventory", label: "Restaurant tables" }],
  explanation: "Manage the active restaurant table floor. Tables with open orders cannot be removed; archived tables can be restored by adding the same name again.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/tables/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantTablesPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { tableSaved?: string; tableRemoved?: string } }) {
  const [mod, restaurantTables, openOrders, settings, menuItems] = await Promise.all([getModule("restaurant-pos"), listRestaurantTables(params.partnerId), listOpenOrdersForPartner(params.partnerId), getRestaurantSettings(params.partnerId), listRestaurantMenuItems(params.partnerId)]);
  const openByTable = new Map(openOrders.map((o) => [o.tableNumber, o] as const));
  const activeTables = restaurantTables.filter(table => table.isActive);

  return (
    <AppShell topbarTitle={`${mod?.label ?? "Restaurant POS"} - Tables`}>
      <OfflineReferenceCache data={{ partnerId: params.partnerId, partnerLabel: "Restaurant", restaurant: { servicePointLabel: settings.servicePointLabel, tables: activeTables.filter(table => !openByTable.has(table.tableNumber)).map(table => table.tableNumber), menuItems: menuItems.map(item => ({ id: item.id, name: item.name, price: item.price, taxRate: item.taxRate })) } }} />
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Service-point floor</h1>
        <p className="mt-1 text-sm text-text-muted">Use a service point for a table, room, hut, cabin, or any order location. Open its order, add menu items, optionally send a kitchen ticket, then bill it.</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href={`/partner/${params.partnerId}/restaurant-pos/settings`} className="inline-flex min-h-11 items-center text-teal underline">Restaurant setup</Link>
          <Link href={`/partner/${params.partnerId}/restaurant-pos/menu`} className="inline-flex min-h-11 items-center text-teal underline">Manage menu</Link>
          {settings.kitchenEnabled && <Link href={`/partner/${params.partnerId}/restaurant-pos/kitchen`} className="inline-flex min-h-11 items-center text-teal underline">Kitchen queue</Link>}
          <Link href={`/partner/${params.partnerId}/restaurant-pos`} className="inline-flex min-h-11 items-center text-teal underline">Order history</Link>
        </div>
        {searchParams?.tableSaved && <p role="status" className="mt-3 text-sm text-success">Table added to the floor.</p>}
        {searchParams?.tableRemoved && <p role="status" className="mt-3 text-sm text-success">Table removed from the floor.</p>}
        <section className="mt-5 rounded-lg border border-border bg-bg-raised p-4">
          <h2 className="mb-3 font-display text-lg font-bold text-text">Add a {settings.servicePointLabel.toLowerCase()}</h2>
          <RecordForm submitLabel={`Add ${settings.servicePointLabel.toLowerCase()}`} action={activateRestaurantTableAction.bind(null, params.partnerId)} fields={[{ key: "tableNumber", label: `${settings.servicePointLabel} name or number`, type: "text", required: true }]} />
        </section>
        {activeTables.length === 0 ? <p className="mt-6 text-sm text-text-muted">No active tables. Add a table to start taking orders.</p> :
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {activeTables.map((table) => {
              const order = openByTable.get(table.tableNumber);
              return (
                <div key={table.id} className="rounded-lg border border-border bg-bg-raised p-4">
                  <Link href={`/partner/${params.partnerId}/restaurant-pos/tables/${encodeURIComponent(table.tableNumber)}`} className="block transition hover:text-teal">
                    <div className="font-display text-lg font-bold text-text">{table.tableNumber}</div>
                    <div className="mt-2">{order ? <StatusChip label={order.status} variant={order.status === "In kitchen" ? "warning" : order.status === "Served" ? "amber" : "teal"} /> : <StatusChip label="Free" variant="neutral" />}</div>
                    {order && <div className="mt-2 text-xs text-text-muted">{order.lines.length} item{order.lines.length === 1 ? "" : "s"} · ₹{order.totalAmount.toFixed(2)}</div>}
                  </Link>
                  {!order && <form action={deactivateRestaurantTableAction.bind(null, params.partnerId, table.id)} className="mt-3"><button className="btn-outline min-h-10" type="submit">Remove from floor</button></form>}
                </div>
              );
            })}
          </div>
        }
        {restaurantTables.some(table => !table.isActive) && <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-text">Archived tables</h2>
          <ul className="flex flex-wrap gap-3">{restaurantTables.filter(table => !table.isActive).map(table => <li key={table.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"><span>{table.tableNumber}</span><form action={restoreRestaurantTableAction.bind(null, params.partnerId, table.tableNumber)}><button className="btn-outline min-h-10" type="submit">Restore</button></form></li>)}</ul>
        </section>}
      </div>
    </AppShell>
  );
}
