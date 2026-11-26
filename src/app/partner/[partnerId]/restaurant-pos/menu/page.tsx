import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/components/RecordForm";
import { registerPage } from "@/lib/designer/registry";
import { getModule } from "@/lib/designer/moduleRegistry";
import { listRestaurantMenuItems } from "@/lib/restaurantPos/data";
import { deactivateRestaurantMenuItemAction, saveRestaurantMenuItemAction, updateRestaurantMenuItemAction } from "../actions";

registerPage({
  id: "restaurant-pos.menu",
  moduleSlug: "restaurant-pos",
  title: "Restaurant Menu",
  path: "/partner/[partnerId]/restaurant-pos/menu",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "menu-items", label: "Menu items and prices" }],
  explanation: "Manage restaurant-specific menu items, categories, prices and tax rates. Changes apply to new order lines; existing orders retain the price and tax captured when items were added.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/menu/page.tsx",
});

export const dynamic = "force-dynamic";
const categoryOptions = ["Starters", "Mains", "Beverages", "Dessert"];
const menuFields = [
  { key: "name", label: "Item name", type: "text" as const, required: true },
  { key: "category", label: "Category", type: "select" as const, options: categoryOptions, required: true },
  { key: "price", label: "Selling price (?)", type: "currency" as const, required: true },
  { key: "taxRate", label: "Tax rate (%)", type: "number" as const, required: true },
];

export default async function RestaurantMenuPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { saved?: string; removed?: string } }) {
  const [module, menu] = await Promise.all([getModule("restaurant-pos"), listRestaurantMenuItems(params.partnerId)]);
  const base = `/partner/${params.partnerId}/restaurant-pos`;
  return <AppShell topbarTitle={`${module?.label ?? "Restaurant POS"} - Menu`}>
    <div className="flex flex-wrap gap-4"><Link href={`${base}/tables`} className="inline-flex min-h-11 items-center text-teal underline">Table floor</Link><Link href={base} className="inline-flex min-h-11 items-center text-teal underline">Order history</Link></div>
    <p className="mb-5 mt-3 max-w-prose text-sm text-text-muted">Enter the correct tax rate for each item. Tax is added to the selling price. Existing open orders keep the prices and tax already captured; changes affect the next item added.</p>
    {searchParams?.saved && <p role="status" className="mb-4 text-sm text-success">Menu item saved.</p>}
    {searchParams?.removed && <p role="status" className="mb-4 text-sm text-success">Menu item archived. Existing orders and bills are retained.</p>}
    <section className="mb-8 rounded-lg border border-border bg-bg-raised p-4">
      <h1 className="mb-3 font-display text-xl font-bold text-text">Add menu item</h1>
      <RecordForm submitLabel="Add item" action={saveRestaurantMenuItemAction.bind(null, params.partnerId)} fields={menuFields} initialValues={{ category: "Mains" }} />
    </section>
    <h2 className="mb-4 font-display text-xl font-bold text-text">Active menu ({menu.length})</h2>
    {menu.length === 0 ? <p className="text-sm text-text-muted">No active items. Add a menu item before starting orders.</p> :
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{menu.map(item => <section key={item.id} className="rounded-lg border border-border bg-bg-raised p-4">
        <RecordForm submitLabel="Save changes" action={updateRestaurantMenuItemAction.bind(null, params.partnerId, item.id)} initialValues={{ name: item.name, category: item.category, price: item.price, taxRate: item.taxRate }} fields={menuFields} />
        <form action={deactivateRestaurantMenuItemAction.bind(null, params.partnerId, item.id)} className="mt-3"><button className="btn-outline min-h-11" type="submit">Archive item</button></form>
      </section>)}</div>
    }
  </AppShell>;
}
