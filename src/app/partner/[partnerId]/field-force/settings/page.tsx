import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getFieldForceSettings } from "@/lib/fieldForce/settingsData";
import { updateFieldForceSettingsAction } from "@/lib/fieldForce/actions";

registerPage({ id: "field-force.settings", moduleSlug: "field-force", title: "Field Force — Settings", path: "/partner/[partnerId]/field-force/settings", kind: "form", superAdminOnly: false, customizableRegions: [], explanation: "Partner-scoped controls for public signup and automated provider offer dispatch.", sourceFile: "src/app/partner/[partnerId]/field-force/settings/page.tsx" });

export const dynamic = "force-dynamic";

export default async function FieldForceSettingsPage({ params }: { params: { partnerId: string } }) {
  const settings = await getFieldForceSettings(params.partnerId);
  const action = updateFieldForceSettingsAction.bind(null, params.partnerId);
  return <AppShell topbarTitle="Field Force — Settings"><div className="mbf-page p-6"><h1 className="font-display text-lg font-bold text-text">Field Force settings</h1><p className="mt-1 text-sm text-text-muted">Control customer/provider signup and automatic job offer dispatch.</p><form action={action} className="mt-6 max-w-xl space-y-4 rounded-lg border border-border bg-bg-raised p-4"><label className="flex items-center justify-between gap-4 text-sm text-text"><span>Customer signup enabled</span><input type="checkbox" name="customerSignupEnabled" value="true" defaultChecked={settings.customerSignupEnabled} /></label><label className="flex items-center justify-between gap-4 text-sm text-text"><span>Provider signup enabled</span><input type="checkbox" name="providerSignupEnabled" value="true" defaultChecked={settings.providerSignupEnabled} /></label><label className="block text-sm text-text"><span className="mb-1 block">Maximum provider offers per booking</span><input name="maxOffersPerBooking" type="number" min="1" max="50" defaultValue={settings.maxOffersPerBooking} className="w-full rounded-md border border-border bg-bg px-3 py-2" /></label><label className="block text-sm text-text"><span className="mb-1 block">Offer expiry in minutes</span><input name="offerExpiryMinutes" type="number" min="1" max="120" defaultValue={settings.offerExpiryMinutes} className="w-full rounded-md border border-border bg-bg px-3 py-2" /></label><button type="submit" className="btn-accent">Save settings</button></form></div></AppShell>;
}
