import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listPartnerStaff } from "@/lib/partnerStaff";
import { AgentsClient } from "./AgentsClient";

registerPage({
  id: "telecalling.agents",
  moduleSlug: "telecalling",
  title: "Telecalling — Agents",
  path: "/partner/[partnerId]/telecalling/agents",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The Telecalling module's own staff roster — create a Telecaller agent account (a generated Agent ID + password, shown once — no email needed), suspend/reactivate one, or reset a forgotten password. This is the ONLY place PartnerStaff accounts get created in the whole app right now (createPartnerStaff existed but had no UI before this). Agents sign in independently at /partner/[partnerId]/telecalling/login with their Agent ID — not the business owner's own /login, and not email.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/agents/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AgentsPage({ params }: { params: { partnerId: string } }) {
  const allStaff = await listPartnerStaff(params.partnerId);
  const agents = allStaff.filter((s) => s.role === "Telecaller");

  return (
    <AppShell topbarTitle="Telecalling — Agents">
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Telecaller Agents</h1>
          <p className="mt-1 text-sm text-text-muted">
            {agents.length} agent{agents.length === 1 ? "" : "s"}. Each signs in on their own at{" "}
            <code className="rounded bg-bg-sunken px-1 py-0.5 text-xs">/partner/{params.partnerId}/telecalling/login</code>.
          </p>
        </div>
        <div className="p-6">
          <AgentsClient
            partnerId={params.partnerId}
            agents={agents.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
