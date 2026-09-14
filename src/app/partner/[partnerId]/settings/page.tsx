import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { listAccessKeysForPartner } from "@/lib/designer/accessKeys";
import { getPartner } from "@/lib/partnerData";
import { SettingsPageClient } from "./SettingsPageClient";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { ConfigForm } from "./ConfigForm";
import { NumberingPanel } from "./NumberingPanel";
import { ServiceCentrePanel } from "./ServiceCentrePanel";
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
    "Partner settings: the top Business Details block (business name, address, GSTIN, timezone, currency, logo upload — all real, persisted Partner columns now; the Enabled Modules grid below it is currently hidden via SHOW_ENABLED_MODULES in SettingsPageClient.tsx, though the underlying request/approve flow stays live), then a real tab switcher (SettingsTabs — only one panel visible at a time) over four REAL persisted sections: Business Profile, Bank Details (both inside the one updatePartnerBusinessProfile form/action — see BusinessProfileForm.tsx), Config (updatePartnerConfig: default labour charge, UPI VPA, Terms & Conditions), Numbering (per-document-type numbering overrides, folded in from the former standalone settings/numbering page), and — only for partners with the Service Centre module enabled — a Service Centre summary tab (ServiceCentrePanel: productDomains/labour charge/terms rollup plus live Telegram connection status, linking back to the tabs/page that actually edit each).",
  sourceFile: "src/app/partner/[partnerId]/settings/page.tsx",
});

/**
 * Server Component wrapper — computes navGroups here (buildPartnerAdminNavGroups
 * needs fs to apply Super-Admin label/icon overrides, which cannot run in a
 * Client Component) and hands the interactive body to SettingsPageClient.
 */
export default async function SettingsPage({ params }: { params: { partnerId: string } }) {
  const [visibleModuleSlugs, partner, accessKeys] = await Promise.all([
    getVisibleModuleSlugs(params.partnerId),
    getPartner(params.partnerId),
    listAccessKeysForPartner(params.partnerId),
  ]);
  const moduleStatuses: Record<string, "active" | "requested" | "none"> = {};
  for (const key of accessKeys) {
    if (key.status === "active" || key.status === "requested") moduleStatuses[key.moduleSlug] = key.status;
  }
  const showServiceCentre = visibleModuleSlugs.includes("service-centre");
  return (
    <AppShell topbarTitle="Settings">
      <SettingsPageClient
        visibleModuleSlugs={visibleModuleSlugs}
        moduleStatuses={moduleStatuses}
        partnerId={params.partnerId}
        businessDetails={{
          businessName: partner?.businessName ?? "",
          address: partner?.addressLine ?? "",
          gstin: partner?.gstin ?? "",
          timezone: partner?.timezone ?? "Asia/Kolkata",
          currency: partner?.currency ?? "INR",
          logoDataUrl: partner?.logoDataUrl ?? null,
        }}
      />
      {partner && (
        <SettingsTabs showServiceCentre={showServiceCentre}>
          <BusinessProfileForm partnerId={params.partnerId} partner={partner} />
          <ConfigForm partnerId={params.partnerId} partner={partner} />
          <NumberingPanel partnerId={params.partnerId} />
          {showServiceCentre && <ServiceCentrePanel partnerId={params.partnerId} partner={partner} />}
        </SettingsTabs>
      )}
    </AppShell>
  );
}
