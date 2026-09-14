import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getPartner } from "@/lib/partnerData";
import { SettingsPageClient } from "./SettingsPageClient";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { ConfigForm } from "./ConfigForm";

registerPage({
  id: "settings.partner",
  moduleSlug: "platform",
  title: "Settings — Partner Profile",
  path: "/partner/[partnerId]/settings",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Partner settings, split into findable sections via the jump-nav at the top: the demo-stub profile/branding block (business name, timezone, currency, logo upload, enabled-modules toggle grid pre-set from this partner's real ModuleAccessKey state via getVisibleModuleSlugs), then two REAL persisted forms — Business Profile + Bank Details (updatePartnerBusinessProfile) and Config (updatePartnerConfig): default labour charge, the partner's own UPI VPA used to print a payment QR on the Sales Invoice, and Terms & Conditions (one general fallback plus a per-document-type override for Job Card / Estimate / Service Record / Sales Invoice, each falling back to the general text and printing nothing when both are blank).",
  sourceFile: "src/app/partner/[partnerId]/settings/page.tsx",
});

const SETTINGS_SECTIONS = [
  { href: "#business-profile", label: "Business Profile" },
  { href: "#bank-details", label: "Bank Details" },
  { href: "#config", label: "Config" },
];

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
      <SettingsPageClient
        visibleModuleSlugs={visibleModuleSlugs}
        sectionNav={
          /* Jump-nav rather than a JS tab widget: this repo has no existing
             tab component to reuse, and the sections below are plain
             Server-rendered forms — anchors keep the whole page printable,
             linkable (/settings#config) and free of a new client bundle. */
          <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
            {SETTINGS_SECTIONS.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-md border border-border bg-bg-raised px-3 py-1.5 text-sm font-semibold text-text hover:border-accent hover:text-accent"
              >
                {section.label}
              </a>
            ))}
          </nav>
        }
      />
      {partner && (
        <>
          <BusinessProfileForm partnerId={params.partnerId} partner={partner} />
          <ConfigForm partnerId={params.partnerId} partner={partner} />
        </>
      )}
    </AppShell>
  );
}
