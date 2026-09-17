import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { computeAlerts, type AlertSeverity } from "@/lib/alerts";

registerPage({
  id: "alerts.list",
  moduleSlug: "platform",
  title: "Alerts",
  path: "/partner/[partnerId]/alerts",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Everything currently needing the partner's attention, computed live from their own BusinessRecords by computeAlerts() (src/lib/alerts.ts): low/out-of-stock inventory items below their own reorderLevel, workorders open past 7 days or past their promised delivery date, invoices past due with an outstanding amountDue, and sub-centre profiles pointing at a parent that doesn't exist. Nothing is stored — an alert disappears when the record that caused it is fixed.",
  sourceFile: "src/app/partner/[partnerId]/alerts/page.tsx",
});

export const dynamic = "force-dynamic";

const DOT_CLASS: Record<AlertSeverity, string> = {
  danger: "bg-danger",
  warning: "bg-accent",
  info: "bg-teal",
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  danger: "Urgent",
  warning: "Needs attention",
  info: "For review",
};

export default async function AlertsPage({ params }: { params: { partnerId: string } }) {
  const alerts = await computeAlerts(params.partnerId);

  return (
    <AppShell topbarTitle="Alerts">
      <div>
        <p className="text-sm text-text-muted">
          Computed live from your own records each time this page loads. There is nothing to mark as
          read — an alert clears itself once the record behind it is dealt with.
        </p>

        {alerts.length === 0 ? (
          <div className="mt-6 rounded-md border border-border bg-bg-raised p-10 text-center">
            <p className="font-display text-base font-bold text-text">All clear</p>
            <p className="mt-1 text-sm text-text-muted">
              No low stock, overdue workorders, overdue invoices or broken sub-centre links right now.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-md border border-border bg-bg-raised">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/partner/${params.partnerId}/${a.href}`}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-bg-sunken"
                >
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${DOT_CLASS[a.severity]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text">{a.title}</span>
                    <span className="mt-0.5 block text-sm text-text-muted">{a.detail}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-text-muted">{SEVERITY_LABEL[a.severity]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
