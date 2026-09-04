import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { SettingsPageClient } from "./SettingsPageClient";

registerPage({
  id: "settings.partner",
  moduleSlug: "platform",
  title: "Settings — Partner Profile",
  path: "/partner/[partnerId]/settings",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Partner profile/branding settings: business name, address, GSTIN, timezone, currency, a demo logo-upload stub, and an enabled-modules toggle grid pre-set from this partner's real ModuleAccessKey state (getVisibleModuleSlugs, src/lib/designer/entitlements.ts) — toggling itself is still a visual demo stub, but the starting state now reflects real access.",
  sourceFile: "src/app/partner/[partnerId]/settings/page.tsx",
});

/**
 * Server Component wrapper — computes navGroups here (buildPartnerAdminNavGroups
 * needs fs to apply Super-Admin label/icon overrides, which cannot run in a
 * Client Component) and hands the interactive body to SettingsPageClient.
 */
export default async function SettingsPage({ params }: { params: { partnerId: string } }) {
  const visibleModuleSlugs = await getVisibleModuleSlugs(params.partnerId);
  return (
    <AppShell topbarTitle="Settings">
      <SettingsPageClient visibleModuleSlugs={visibleModuleSlugs} />
    </AppShell>
  );
}
