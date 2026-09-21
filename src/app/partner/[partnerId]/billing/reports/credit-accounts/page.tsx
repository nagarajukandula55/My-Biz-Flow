import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getInvoiceBalance } from "@/lib/sample-data/billing-payments";

registerPage({
  id: "billing.reports.credit-accounts",
  moduleSlug: "billing",
  title: "Billing — Reports — Credit Accounts",
  path: "/partner/[partnerId]/billing/reports/credit-accounts",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Per-contact credit exposure — every Billing Contact's total outstanding balance (unpaid/partially-paid invoices, same getInvoiceBalance computation the Outstanding/AR Aging report uses) against their own Credit Limit (set on the Contact record). Matched by contact name against each invoice's `customer` field — Billing invoices don't carry a hard contactId today, only a free-text name, so this join is name-based; a contact whose name doesn't exactly match how it was typed on an invoice won't be matched. Utilization is colour-banded green (under half the limit) through red (at or over the limit) so exposure reads at a glance without doing the math per row. A contact with no Credit Limit set shows as unlimited/untracked rather than a fabricated 0% or 100%.",
  sourceFile: "src/app/partner/[partnerId]/billing/reports/credit-accounts/page.tsx",
});

export const dynamic = "force-dynamic";

const BAND_VARIANT: Record<string, StatusVariant> = {
  "No Limit Set": "neutral",
  Healthy: "success",
  Watch: "warning",
  High: "amber",
  "Over Limit": "danger",
};

function bandFor(pct: number | null): string {
  if (pct === null) return "No Limit Set";
  if (pct >= 1) return "Over Limit";
  if (pct >= 0.8) return "High";
  if (pct >= 0.5) return "Watch";
  return "Healthy";
}

export default async function CreditAccountsReportPage({ params }: { params: { partnerId: string } }) {
  const [contacts, invoices, payments] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    listBusinessRecords(params.partnerId, "billing"),
    listBusinessRecords(params.partnerId, "billing-payments"),
  ]);

  // Outstanding balance per invoice, then summed by the invoice's own
  // `customer` text — invoices have no hard contactId today (see
  // explanation above), so this is a name match, normalized to
  // lower-case/trimmed to absorb the most common typing differences.
  const balanceByCustomerName = new Map<string, number>();
  for (const inv of invoices) {
    const { balance } = getInvoiceBalance(payments, String(inv["id"]), Number(inv["totalAmount"] ?? 0));
    if (balance <= 0) continue;
    const key = String(inv["customer"] ?? "").trim().toLowerCase();
    if (!key) continue;
    balanceByCustomerName.set(key, (balanceByCustomerName.get(key) ?? 0) + balance);
  }

  const rows = contacts
    .map((c) => {
      const name = String(c["name"] ?? "");
      const outstanding = balanceByCustomerName.get(name.trim().toLowerCase()) ?? 0;
      const creditLimit = Number(c["creditLimit"] ?? 0) || null;
      const pct = creditLimit ? outstanding / creditLimit : null;
      return {
        id: String(c["id"]),
        name,
        outstanding,
        creditLimit,
        pct,
        band: bandFor(pct),
      };
    })
    // Only show accounts that actually matter: either they owe something,
    // or a credit limit is being tracked for them at all.
    .filter((r) => r.outstanding > 0 || r.creditLimit !== null)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const overLimit = rows.filter((r) => r.band === "Over Limit");
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <AppShell topbarTitle="Credit Accounts">
      <div>
        <p className="text-sm text-text-muted">
          Outstanding balance vs. each contact's own Credit Limit (set on Billing &gt; Contacts) — colour-banded
          green through red.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DashboardWidget label="Accounts Tracked" value={String(rows.length)} />
          <DashboardWidget label="Total Outstanding" value={`₹${totalOutstanding.toLocaleString("en-IN")}`} />
          <DashboardWidget label="Over Limit" value={String(overLimit.length)} neon={overLimit.length > 0} />
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No contact has an outstanding balance or a Credit Limit set yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2.5">Contact</th>
                  <th className="px-3 py-2.5 text-right">Outstanding</th>
                  <th className="px-3 py-2.5 text-right">Credit Limit</th>
                  <th className="px-3 py-2.5 text-right">Utilization</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">₹{r.outstanding.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.creditLimit ? `₹${r.creditLimit.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.pct !== null ? `${Math.round(r.pct * 100)}%` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip label={r.band} variant={BAND_VARIANT[r.band]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
