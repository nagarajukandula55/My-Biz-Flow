import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { PARTNER_INTEGRATIONS } from "@/lib/integration/partnerIntegrationCatalog";

registerPage({
  id: "settings.partner-integrations",
  moduleSlug: "platform",
  title: "Settings — Integrations",
  path: "/partner/[partnerId]/settings/integrations",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Partner-owned integration catalog. Each business can connect its own tax, banking, payments, shipping, logistics, communication and productivity providers. Credentials are never shown in this catalog and providers remain disabled until a secure connection workflow is enabled.",
  sourceFile: "src/app/partner/[partnerId]/settings/integrations/page.tsx",
});

export default async function PartnerIntegrationsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  return <AppShell topbarTitle="Integrations"><div className="mbf-page"><div className="border-b border-border bg-bg-raised px-6 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-xl font-bold text-text">Partner integrations</h1><p className="mt-2 max-w-[70ch] text-sm text-text-muted">Connect services owned by this business. My Biz Flow will keep connection status, delivery logs and failures separate per provider and per business.</p></div><Link href={`/partner/${params.partnerId}/settings`} className="btn-outline">Back to settings</Link></div><div className="mt-4 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-text">Provider connections are not configured yet. When enabled, secrets will be encrypted and masked; this page will never display raw credentials.</div></div><div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">{PARTNER_INTEGRATIONS.map((integration) => <section key={integration.id} className="rounded-md border border-border bg-bg-raised p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-base font-bold text-text">{integration.name}</h2><p className="mt-1 text-xs uppercase tracking-wide text-text-muted">{integration.category}</p></div><StatusChip label="Not connected" variant="warning" /></div><p className="mt-3 text-sm text-text-muted">{integration.description}</p><p className="mt-3 text-xs text-text-muted">Used by: {integration.requiredModules.join(", ")}</p><button type="button" disabled className="btn-outline mt-4 w-full cursor-not-allowed opacity-60">Setup connection coming next</button></section>)}</div></div></AppShell>;
}
