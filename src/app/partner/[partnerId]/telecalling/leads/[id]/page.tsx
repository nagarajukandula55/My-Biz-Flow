import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StatusChip } from "@/components/StatusChip";
import { getLead } from "@/lib/telecalling/leadsData";
import { listCallsForLead } from "@/lib/telecalling/callsData";
import { listMessagesForLead } from "@/lib/telecalling/messaging";

registerPage({
  id: "telecalling.lead-detail",
  moduleSlug: "telecalling",
  title: "Telecalling — Lead Detail",
  path: "/partner/[partnerId]/telecalling/leads/[id]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Full history for one Lead: every logged call (outcome + remark) and every triggered SMS/WhatsApp message, newest first. Real data — Prisma-backed, scoped to this partner.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/leads/[id]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { partnerId: string; id: string } }) {
  const lead = await getLead(params.id, params.partnerId);
  if (!lead) notFound();

  const [calls, messages] = await Promise.all([
    listCallsForLead(lead.id, params.partnerId),
    listMessagesForLead(lead.id, params.partnerId),
  ]);

  return (
    <AppShell topbarTitle="Telecalling — Lead Detail">
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <Link href={`/partner/${params.partnerId}/telecalling`} className="text-sm font-semibold text-accent hover:underline">
            ← Back to Leads
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-lg font-bold text-text">{lead.name}</h1>
            <StatusChip label={lead.status} />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {lead.phone} {lead.email ? `· ${lead.email}` : ""} {[lead.state, lead.city].filter(Boolean).length ? `· ${[lead.state, lead.city].filter(Boolean).join(", ")}` : ""}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Source: {lead.source ?? "—"} · Batch: {lead.importBatch} · Assigned to: {lead.assignedToName ?? "Unassigned"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-display text-base font-bold text-text">Call History</h2>
            {calls.length === 0 ? (
              <p className="text-sm text-text-muted">No calls logged yet.</p>
            ) : (
              <div className="space-y-2">
                {calls.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-bg-raised p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text">{c.outcome}</span>
                      <span className="text-xs text-text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">by {c.agentName}</p>
                    {c.notes && <p className="mt-1.5 text-sm text-text">{c.notes}</p>}
                    {c.callbackAt && (
                      <p className="mt-1.5 text-xs font-semibold text-warning">
                        Callback scheduled: {new Date(c.callbackAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-display text-base font-bold text-text">Message History</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-text-muted">No messages sent yet.</p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-bg-raised p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text">{m.channel.toUpperCase()}</span>
                      <span className="text-xs text-text-muted">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-text">{m.body}</p>
                    <StatusChip
                      className="mt-1.5"
                      label={m.status}
                      variant={m.status === "sent" ? "success" : m.status === "failed" ? "danger" : "neutral"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
