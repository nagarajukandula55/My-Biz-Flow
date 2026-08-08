import { AppShell } from "@/components/AppShell";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { SettingsPageClient } from "./SettingsPageClient";

registerPage({
  id: "settings.vendor",
  moduleSlug: "platform",
  title: "Settings — Vendor Profile",
  path: "/vendor/[vendorId]/settings",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Vendor profile/branding settings: business name, address, GSTIN, timezone, currency, a demo logo-upload stub, and a read-only enabled-modules toggle grid (visually real, does not persist — no per-vendor enabled-modules data model yet).",
  sourceFile: "src/app/vendor/[vendorId]/settings/page.tsx",
});

/**
 * Server Component wrapper — computes navGroups here (buildVendorAdminNavGroups
 * needs fs to apply Super-Admin label/icon overrides, which cannot run in a
 * Client Component) and hands the interactive body to SettingsPageClient.
 */
export default async function SettingsPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups("settings")} topbarTitle="Settings">
      <SettingsPageClient />
    </AppShell>
  );
}
