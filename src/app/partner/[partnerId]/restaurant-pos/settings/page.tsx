import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/components/RecordForm";
import { getRestaurantSettings } from "@/lib/restaurantPos/data";
import { saveRestaurantSettingsAction } from "../actions";
import { registerPage } from "@/lib/designer/registry";

registerPage({ id: "restaurant-pos.settings", moduleSlug: "restaurant-pos", title: "Restaurant setup", path: "/partner/[partnerId]/restaurant-pos/settings", kind: "form", superAdminOnly: false, customizableRegions: [{ key: "operating-preferences", label: "Service-point and kitchen settings" }], explanation: "Set the custom name used for tables, rooms, huts, or other order locations, and choose whether to use the internal kitchen queue.", sourceFile: "src/app/partner/[partnerId]/restaurant-pos/settings/page.tsx" });

export const dynamic = "force-dynamic";

export default async function RestaurantSettingsPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { saved?: string } }) {
  const settings = await getRestaurantSettings(params.partnerId);
  const base = `/partner/${params.partnerId}/restaurant-pos`;
  return <AppShell topbarTitle="Restaurant setup">
    <div className="flex flex-wrap gap-4"><Link href={`${base}/tables`} className="inline-flex min-h-11 items-center text-teal underline">Service-point floor</Link><Link href={`${base}/menu`} className="inline-flex min-h-11 items-center text-teal underline">Menu</Link></div>
    <h1 className="mt-3 font-display text-2xl font-bold text-text">Restaurant setup</h1>
    <p className="mb-5 mt-2 max-w-prose text-sm text-text-muted">Choose how your order locations are named. Enter labels such as Table, Room, Hut, Cabin, or Dining area. Kitchen tickets can be switched on or off; billing and order history work in either mode. The enabled kitchen queue syncs orders inside this app; it does not connect a printer or an external kitchen system.</p>
    {searchParams?.saved && <p role="status" className="mb-4 text-sm text-success">Restaurant settings saved.</p>}
    <RecordForm submitLabel="Save restaurant settings" action={saveRestaurantSettingsAction.bind(null, params.partnerId)} initialValues={{ servicePointLabel: settings.servicePointLabel, kitchenEnabled: String(settings.kitchenEnabled) }} fields={[
      { key: "servicePointLabel", label: "Order location name", type: "text", required: true, placeholder: "Table, Hut, Room, Cabin" },
      { key: "kitchenEnabled", label: "Kitchen ticket workflow", type: "select", options: ["true", "false"], optionLabels: { true: "Enabled - send orders to the kitchen queue", false: "Disabled - billing and order recording only" }, required: true },
    ]} />
  </AppShell>;
}
