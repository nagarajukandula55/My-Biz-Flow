import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NumberingSchemeEditor } from "@/components/NumberingSchemeEditor";
import { getPartner } from "@/lib/partnerData";
import { prisma } from "@/lib/prisma";
import { getWorkspaceProfiles, documentBelongsToWorkspace } from "@/lib/workspaceProfiles";
import { NUMBERED_DOCUMENT_TYPES, DEFAULT_SCHEME, type NumberingScheme } from "@/lib/designer/numberingFormat";
import { saveWorkspaceConfig } from "@/lib/workspaceSettingsActions";
import { SettingsPageClient } from "@/app/partner/[partnerId]/settings/SettingsPageClient";
import { SettingsTabs } from "@/app/partner/[partnerId]/settings/SettingsTabs";
import { BusinessProfileForm } from "@/app/partner/[partnerId]/settings/BusinessProfileForm";
import { canConfigureBusinessPayments } from "@/lib/workspacePaymentSettings";

const INPUT = "mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text";

async function WorkspaceNumbering({ partnerId, modules }: { partnerId: string; modules: string[] }) {
  const documents = NUMBERED_DOCUMENT_TYPES.filter(doc => documentBelongsToWorkspace(doc.id, modules));
  const ids = documents.map(doc => doc.id);
  // Two bounded reads instead of 2–3 reads for every document in the platform.
  const [overrides, defaults] = ids.length ? await Promise.all([
    prisma.numberingPartnerScheme.findMany({ where: { partnerId, documentType: { in: ids } }, select: { documentType: true, scheme: true } }),
    prisma.numberingMainScheme.findMany({ where: { documentType: { in: ids } }, select: { documentType: true, scheme: true } }),
  ]) : [[], []];
  return <section id="settings-panel-numbering" className="border-t border-border pt-8">
    <h2 className="font-display text-lg font-bold text-text">Document numbering</h2>
    {!documents.length && <p className="mt-2 text-sm text-text-muted">Your active modules have no configurable document sequences.</p>}
    <div className="mt-4 flex flex-col gap-4">{documents.map(doc => {
      const override = overrides.find(row => row.documentType === doc.id)?.scheme;
      const scheme = override ?? defaults.find(row => row.documentType === doc.id)?.scheme ?? DEFAULT_SCHEME;
      return <NumberingSchemeEditor key={doc.id} documentType={doc.id} documentTypeLabel={doc.id.startsWith("invoice.") ? doc.label.replace(" (Billing + Service Centre)", "") : doc.label}
        initialScheme={scheme as unknown as NumberingScheme} partnerId={partnerId} isPartnerOverride={Boolean(override)} />;
    })}</div>
  </section>;
}

export async function ModuleSettings({ partnerId, modules }: { partnerId: string; modules: string[] }) {
  const partner = await getPartner(partnerId);
  if (!partner) notFound();
  const profiles = getWorkspaceProfiles(modules);
  return <AppShell topbarTitle="Settings">
    <SettingsPageClient partnerId={partnerId} visibleModuleSlugs={modules} moduleStatuses={Object.fromEntries(modules.map(slug => [slug, "active" as const]))} serializedInventoryEnabled={partner.serializedInventoryEnabled}
      businessDetails={{ businessName: partner.businessName, address: partner.addressLine, gstin: partner.gstin ?? "", timezone: partner.timezone, currency: partner.currency, logoDataUrl: partner.logoDataUrl, showLogoOnDocuments: partner.showLogoOnDocuments }} />
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-text">Your module settings</h2>
      <p className="mt-2 text-sm text-text-muted">Setup and management for the modules enabled on your account.</p>
      <Link className="btn-outline mt-3" href={`/partner/${partnerId}/settings/notifications`}>Telegram notifications</Link>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{profiles.map(profile => <div className="card p-4" key={profile.slug}>
        <h3 className="font-display font-bold text-text">{profile.label}</h3>
        <ul className="mt-3 space-y-2">{profile.settings.map(link => <li key={link.path}><Link className="text-sm text-teal underline" href={`/partner/${partnerId}/${link.path}`}>{link.label}</Link></li>)}</ul>
      </div>)}</div>
    </section>
    <Suspense fallback={null}><SettingsTabs>
      <BusinessProfileForm partnerId={partnerId} partner={partner} showProductDomains={false} />
      <section id="settings-panel-config" className="border-t border-border pt-8">
        <h2 className="font-display text-lg font-bold text-text">Document defaults</h2>
        <form action={saveWorkspaceConfig.bind(null, partnerId)} className="mt-4 space-y-4">
          <label className="block text-sm text-text">General document terms<textarea name="serviceTerms" rows={3} maxLength={10000} defaultValue={partner.serviceTerms ?? ""} className={INPUT} /></label>
          {canConfigureBusinessPayments(modules) && <div>
            <h3 className="font-display font-bold text-text">Customer payment instructions</h3>
            <p className="mt-2 text-sm text-text-muted">Use your own business account for customer payments. Cash, manual UPI and other payments are recorded by your business. Saving a UPI ID does not connect a gateway or confirm money received. Check your bank or payment app before recording a receipt. Platform subscription payments are separate.</p>
            <label className="mt-3 block text-sm text-text">Business UPI ID (optional)<input name="upiId" maxLength={200} placeholder="business@bank" defaultValue={partner.upiId ?? ""} className={INPUT} /></label>
            <p className="mt-2 text-sm text-text-muted">This saves your business payment destination for supported documents. A connection to your own payment provider is optional and is not configured here.</p>
          </div>}
          {modules.includes("billing") && <>
            <label className="block text-sm text-text">Invoice terms<textarea name="invoiceTerms" rows={3} maxLength={10000} defaultValue={partner.invoiceTerms ?? ""} className={INPUT} /></label>
          </>}
          <button className="btn-accent" type="submit">Save document defaults</button>
        </form>
      </section>
      <WorkspaceNumbering partnerId={partnerId} modules={modules} />
    </SettingsTabs></Suspense>
  </AppShell>;
}
