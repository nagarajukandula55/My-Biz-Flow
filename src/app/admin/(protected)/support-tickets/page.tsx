import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listPartners } from "@/lib/partnerData";
import { listAllSupportTickets } from "@/lib/supportTickets";
import { setSupportTicketStatusAction } from "@/lib/supportTicketActions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.support-tickets.list",
  moduleSlug: "platform",
  title: "Support Tickets",
  path: "/admin/support-tickets",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Every partner's support message, submitted from the floating Support widget on their pages (src/components/SupportWidget.tsx), across the whole platform. Stored as a BusinessRecord ('support-tickets' moduleSlug, src/lib/supportTickets.ts) rather than a new Prisma model. This pass ships read + resolve; inline admin reply back to the partner is a follow-up (the widget/ticket has no reply thread field yet).",
  sourceFile: "src/app/admin/(protected)/support-tickets/page.tsx",
});

export default async function SupportTicketsPage() {
  const [partners, tickets] = await Promise.all([listPartners(), listAllSupportTickets()]);
  const partnerNameById = new Map(partners.map((p) => [p.id, p.businessName]));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Support Tickets</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-text-muted">
            Messages partners submit from the Support bubble on their pages. Mark a ticket resolved once
            you&apos;ve followed up with the partner directly (by phone/email) — inline reply-from-here is a
            follow-up, not built yet.
          </p>
        </div>

        <div className="overflow-x-auto p-6">
          {tickets.length === 0 ? (
            <p className="text-sm text-text-muted">No support tickets yet.</p>
          ) : (
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2 pr-4 font-medium">Partner</th>
                  <th className="py-2 pr-4 font-medium">Message</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={`${ticket.partnerId}:${ticket.id}`} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-4 text-text">
                      {partnerNameById.get(ticket.partnerId) ?? ticket.partnerId}{" "}
                      <span className="text-text-muted">({ticket.partnerId})</span>
                    </td>
                    <td className="max-w-md py-2 pr-4 whitespace-pre-wrap text-text">{ticket.message}</td>
                    <td className="py-2 pr-4 text-text-muted">{new Date(ticket.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          ticket.status === "resolved"
                            ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
                            : "rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning"
                        }
                      >
                        {ticket.status === "resolved" ? "Resolved" : "Open"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <form action={setSupportTicketStatusAction}>
                        <input type="hidden" name="partnerId" value={ticket.partnerId} />
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input type="hidden" name="status" value={ticket.status === "resolved" ? "open" : "resolved"} />
                        <button type="submit" className="btn-ghost text-xs">
                          {ticket.status === "resolved" ? "Reopen" : "Mark resolved"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SuperAdminGate>
  );
}
