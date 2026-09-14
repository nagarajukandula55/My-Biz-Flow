import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getPartner } from "@/lib/partnerData";
import { SettingsPageClient } from "./SettingsPageClient";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { ConfigForm } from "./ConfigForm";
import { NumberingPanel } from "./NumberingPanel";
import { SettingsTabs } from "./SettingsTabs";

registerPage({
  id: "settings.partner",
  moduleSlug: "platform",
  title: "Settings — Partner Profile",
  path: "/partner/[partnerId]/settings",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Partner settings: the demo-stub profile/branding block (business name, timezone, currency, logo upload, enabled-modules toggle grid pre-set from this partner's real ModuleAccessKey state via getVisibleModuleSlugs), then a real tab switcher (SettingsTabs — only one panel visible at a time) over four REAL persisted sections: Business Profile, Bank Details (both inside the one updatePartnerBusinessProfile form/action — see BusinessProfileForm.tsx), Config (updatePartnerConfig: default labour charge, UPI VPA, Terms & Conditions), and Numbering (per-document-type numbering overrides, folded in from the former standalone settings/numbering page).",
  sourceFile: "src/app/partner/[partnerId]/settings/page.tsx",
});

/**
 * Server Component wrapper — computes navGroups here (buildPartnerAdminNavGroups
 * needs fs to apply Super-Admin label/icon overrides, which cannot run in a
 * Client Component) and hands the interactive body to SettingsPageClient.
 */
export default async function SettingsPage({ params }: { params: { partnerId: string } }) {
  const [visibleModuleSlugs, partner] = await Promise.all([
    getVisibleModuleSlugs(params.partnerId),
    getPartner(params.partnerId),
  ]);
  return (
    <AppShell topbarTitle="Settings">
      <SettingsPageClient visibleModuleSlugs={visibleModuleSlugs} />
      {partner && (
        <SettingsTabs>
          <BusinessProfileForm partnerId={params.partnerId} partner={partner} />
          <ConfigForm partnerId={params.partnerId} partner={partner} />
          <NumberingPanel partnerId={params.partnerId} />
        </SettingsTabs>
      )}
    </AppShell>
  );
}
