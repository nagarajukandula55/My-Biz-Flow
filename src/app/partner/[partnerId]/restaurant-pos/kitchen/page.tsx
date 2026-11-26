import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { getRestaurantSettings, listOpenOrdersForPartner } from "@/lib/restaurantPos/data";
import { KitchenQueue } from "./KitchenQueue";

registerPage({
  id: "restaurant-pos.kitchen",
  moduleSlug: "restaurant-pos",
  title: "Restaurant Kitchen Queue",
  path: "/partner/[partnerId]/restaurant-pos/kitchen",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "kitchen-ticket-fields", label: "Kitchen tickets" }],
  explanation: "Shows all sent kitchen tickets for active orders and refreshes every 15 seconds. Kitchen staff can mark completed tickets served from this screen.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/kitchen/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantKitchenPage({ params }: { params: { partnerId: string } }) {
  const [module, orders, settings] = await Promise.all([getModule("restaurant-pos"), listOpenOrdersForPartner(params.partnerId), getRestaurantSettings(params.partnerId)]);
  const kitchenOrders = orders.filter(order => order.status === "In kitchen");
  return <AppShell topbarTitle={`${module?.label ?? "Restaurant POS"} - Kitchen`}>
    <div className="flex flex-wrap gap-4"><Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="inline-flex min-h-11 items-center text-teal underline">Service-point floor</Link><Link href={`/partner/${params.partnerId}/restaurant-pos/menu`} className="inline-flex min-h-11 items-center text-teal underline">Menu setup</Link></div>
    <h1 className="mt-3 font-display text-2xl font-bold text-text">Kitchen queue</h1>
    {settings.kitchenEnabled ? <KitchenQueue partnerId={params.partnerId} orders={kitchenOrders} /> : <p className="mt-4 text-sm text-text-muted">Kitchen tickets are disabled. Enable them in Restaurant setup to use the queue.</p>}
  </AppShell>;
}
