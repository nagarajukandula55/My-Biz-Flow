import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listLeadsForAgent } from "@/lib/telecalling/leadsData";
import { getPartnerStaff } from "@/lib/partnerStaff";
import { listTemplates } from "@/lib/telecalling/templatesData";
import { getStaffSession } from "@/lib/requirePartnerSession";
import { staffLogoutAction } from "@/lib/telecalling/agentAuth";
import { QueueClient } from "./QueueClient";

registerPage({
  id: "telecalling.queue",
  moduleSlug: "telecalling",
  title: "Telecalling — My Call Queue",
  path: "/partner/[partnerId]/telecalling/queue",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The Telecaller agent's own workspace, reached only via their own login (/partner/[partnerId]/telecalling/login) — a click-to-call button (tel: link, opens the phone's dialer), a disposition form to update status and remark after every call, and a button to trigger an SMS/WhatsApp template message. The business owner viewing this same URL sees it as themself (no agent identity), since only a real staff session has a queue.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/queue/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { view?: string };
}) {
  const session = await getStaffSession();
  if (!session || session.partnerId !== params.partnerId) {
    redirect(`/partner/${params.partnerId}/telecalling/login`);
  }

  const staff = await getPartnerStaff(params.partnerId, session.staffId);
  if (!staff) {
    redirect(`/partner/${params.partnerId}/telecalling/login`);
  }

  const view = searchParams.view === "closed" ? "closed" : "active";

  const [leads, templates] = await Promise.all([
    listLeadsForAgent(params.partnerId, session.staffId, { view }),
    listTemplates(params.partnerId),
  ]);

  const boundLogout = staffLogoutAction.bind(null, params.partnerId);

  return (
    <AppShell
      topbarTitle="Telecalling — My Call Queue"
      topbarActions={
        <form action={boundLogout}>
          <button type="submit" className="text-sm font-semibold text-text-muted hover:text-text">
            Sign out ({staff?.name})
          </button>
        </form>
      }
    >
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">My Call Queue</h1>
          <p className="mt-1 text-sm text-text-muted">Leads assigned to you, ready to call.</p>
        </div>
        <div className="p-6">
          <QueueClient
            partnerId={params.partnerId}
            agentId={session.staffId}
            view={view}
            leads={leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() }))}
            templates={templates.map((t) => ({ id: t.id, name: t.name, channel: t.channel, category: t.category }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
