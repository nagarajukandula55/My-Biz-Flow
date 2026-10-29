import { AppShell } from "@/components/AppShell";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { registerPage } from "@/lib/designer/registry";
import { updateDealerOrderRequestAction } from "../actions";

registerPage({ id: "wholesale-b2b.portal-requests", moduleSlug: "wholesale-b2b", title: "Dealer Order Requests", path: "/partner/[partnerId]/wholesale-b2b/portal-links/requests", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Review and update requests submitted by dealers through signed portal links.", sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/portal-links/requests/page.tsx" });

const statuses = ["Open", "Reviewing", "Quoted", "Accepted", "Declined"];
export default async function DealerOrderRequestsPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") return <AppShell topbarTitle="Dealer Order Requests"><div className="mbf-page p-6">Owner access is required.</div></AppShell>;
  const requests = await listBusinessRecords(params.partnerId, "dealer-order-request");
  return <AppShell topbarTitle="Dealer Order Requests"><div className="mbf-page space-y-6 p-6"><div><h1 className="font-display text-xl font-bold text-text">Dealer Order Requests</h1><p className="mt-1 text-sm text-text-muted">Review portal requests before creating a wholesale order.</p></div><div className="space-y-3">{requests.map(request => <div key={String(request.id)} className="rounded-xl border border-border bg-surface p-4"><div className="font-medium">{String(request.material)} · Qty {String(request.quantity)}</div><p className="mt-1 text-sm text-text-muted">Dealer ID: {String(request.customerId)}{request.notes ? ` · ${String(request.notes)}` : ""}</p><form action={updateDealerOrderRequestAction.bind(null, params.partnerId)} className="mt-3 flex flex-wrap items-center gap-2"><input type="hidden" name="requestId" value={String(request.id)} /><select name="status" defaultValue={String(request.status)} className="rounded border border-border bg-bg p-2 text-sm">{statuses.map(status => <option key={status}>{status}</option>)}</select><button className="btn-outline" type="submit">Save status</button></form></div>)}{requests.length === 0 && <p className="text-sm text-text-muted">No dealer requests yet.</p>}</div></div></AppShell>;
}
