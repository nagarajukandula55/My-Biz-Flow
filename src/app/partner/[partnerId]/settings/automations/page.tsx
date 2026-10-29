import { AppShell } from "@/components/AppShell";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listWorkflowRules } from "@/lib/workflowAutomation";
import { createAutomationAction } from "./actions";
import { registerPage } from "@/lib/designer/registry";

registerPage({ id: "settings.automations", moduleSlug: "platform", title: "Workflow Automations", path: "/partner/[partnerId]/settings/automations", kind: "form", superAdminOnly: false, customizableRegions: [], explanation: "Owner-configured rules that create follow-up tasks and queue notifications from billing, stock, quotation, workorder, dealer-credit and project events.", sourceFile: "src/app/partner/[partnerId]/settings/automations/page.tsx" });

const triggers = [
  ["invoice.overdue", "Invoice becomes overdue", "billing"],
  ["stock.low", "Stock reaches reorder level", "inventory"],
  ["quotation.approved", "Quotation is approved", "billing"],
  ["workorder.completed", "Workorder is completed", "service-centre"],
  ["dealer.credit-exceeded", "Dealer exceeds credit limit", "wholesale-b2b"],
  ["project.milestone-completed", "Project milestone is completed", "interior-design"],
  ["procurement.rfq-created", "Procurement RFQ is created", "inventory"],
] as const;

export default async function WorkflowAutomationsPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind !== "owner") return <AppShell topbarTitle="Workflow Automations"><div className="mbf-page p-6">Owner access is required.</div></AppShell>;
  const rules = await listWorkflowRules(params.partnerId);
  const action = createAutomationAction.bind(null, params.partnerId);
  return <AppShell topbarTitle="Workflow Automations"><div className="mbf-page space-y-6 p-6">
    <div><h1 className="font-display text-xl font-bold text-text">Workflow Automations</h1><p className="mt-1 max-w-2xl text-sm text-text-muted">Turn business events into follow-up tasks. Rules are partner-scoped and can be expanded with notifications and record updates.</p></div>
    <form action={action} className="grid max-w-3xl gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
      <label className="text-sm">Name<input name="name" required className="mt-1 w-full rounded border border-border bg-bg p-2" placeholder="Overdue invoice follow-up" /></label>
      <label className="text-sm">Trigger<select name="trigger" className="mt-1 w-full rounded border border-border bg-bg p-2">{triggers.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm">Module<select name="moduleSlug" className="mt-1 w-full rounded border border-border bg-bg p-2">{[...new Set(triggers.map(([, , module]) => module))].map(module => <option key={module} value={module}>{module}</option>)}</select></label>
      <label className="text-sm">Task title<input name="taskTitle" required className="mt-1 w-full rounded border border-border bg-bg p-2" placeholder="Call customer and collect payment" /></label>
      <label className="text-sm">Due in days<input name="dueInDays" type="number" min="0" defaultValue="1" className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <div className="sm:col-span-2"><button className="btn-accent" type="submit">Create automation</button></div>
    </form>
    <section><h2 className="font-display text-lg font-semibold text-text">Configured rules</h2>{rules.length === 0 ? <p className="mt-2 text-sm text-text-muted">No automations configured yet.</p> : <div className="mt-3 space-y-2">{rules.map(rule => <div key={String(rule.id)} className="rounded-lg border border-border bg-surface p-4"><div className="font-medium text-text">{String(rule.name)}</div><div className="text-sm text-text-muted">{String(rule.trigger)} · {String(rule.moduleSlug)} · {rule.enabled === false ? "Disabled" : "Enabled"}</div></div>)}</div>}</section>
  </div></AppShell>;
}
