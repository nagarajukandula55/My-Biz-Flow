import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listTemplates } from "@/lib/telecalling/templatesData";
import { TemplatesClient } from "./TemplatesClient";

registerPage({
  id: "telecalling.templates",
  moduleSlug: "telecalling",
  title: "Telecalling — Message Templates",
  path: "/partner/[partnerId]/telecalling/templates",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "SMS/WhatsApp message templates agents can trigger for a Lead (Welcome, product info with links, follow-ups). {{name}}/{{link}} placeholders are filled in per-lead at send time. Real data — Prisma-backed (MessageTemplate table, scoped to this partner). Actual delivery uses src/lib/sms.ts / src/lib/whatsapp.ts, which no-op until real provider keys are set.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/templates/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function TemplatesPage({ params }: { params: { partnerId: string } }) {
  const templates = await listTemplates(params.partnerId);

  return (
    <AppShell topbarTitle="Telecalling — Message Templates">
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Message Templates</h1>
          <p className="mt-1 text-sm text-text-muted">
            {templates.length} template{templates.length === 1 ? "" : "s"}. Use {"{{name}}"} and {"{{link}}"} as placeholders.
          </p>
        </div>
        <div className="p-6">
          <TemplatesClient
            partnerId={params.partnerId}
            templates={templates.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
