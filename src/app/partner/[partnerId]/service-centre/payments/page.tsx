import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { registerPage } from "@/lib/designer/registry";
import { listBusinessRecords } from "@/lib/businessRecords";
import { billingPaymentColumns } from "@/lib/sample-data/billing-payments";
import { prisma } from "@/lib/prisma";
import { formatCurrencyINR, formatDate } from "@/lib/format";

registerPage({
  id: "service-centre.payments",
  moduleSlug: "service-centre",
  title: "Service Centre — Payments & Settlements",
  path: "/partner/[partnerId]/service-centre/payments",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Honest equivalent of AN-CRM's vendor Payouts page, which is AN Group paying money TO a vendor — that relationship doesn't exist in My Biz Flow's SaaS model (partners pay MBF, not the reverse). This shows two real payment histories that DO exist here instead: what this partner has paid MBF for their own subscription, and what their own customers have paid them via Billing.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/payments/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PaymentsSettlementsPage({ params }: { params: { partnerId: string } }) {
  const [subscriptionPayments, customerPayments] = await Promise.all([
    prisma.subscriptionPayment.findMany({ where: { partnerId: params.partnerId }, orderBy: { capturedAt: "desc" } }),
    listBusinessRecords(params.partnerId, "billing-payments"),
  ]);

  const subscriptionTotal = subscriptionPayments.reduce((sum, p) => sum + p.amount, 0);
  const customerTotal = customerPayments.reduce((sum, p) => sum + Number(p["amount"] ?? 0), 0);

  return (
    <AppShell topbarTitle="Payments & Settlements">
      <div className="space-y-8">
        <p className="text-sm text-text-muted">
          My Biz Flow doesn't pay Service Centre partners — partners subscribe to and pay MBF. This page shows two
          real payment histories instead: what you've paid MBF for your subscription, and what your own customers
          have paid you (from Billing &gt; Payments).
        </p>

        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold text-text">Your subscription payments to My Biz Flow</h2>
            <span className="text-sm font-semibold text-text">{formatCurrencyINR(subscriptionTotal / 100)}</span>
          </div>
          {subscriptionPayments.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No subscription payments captured yet.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Razorpay Payment ID</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionPayments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-text-muted">{formatDate(p.capturedAt.toISOString())}</td>
                      <td className="px-4 py-2 text-text">{formatCurrencyINR(p.amount / 100)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-text-muted">{p.razorpayPaymentId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold text-text">Payments collected from your customers</h2>
            <span className="text-sm font-semibold text-text">{formatCurrencyINR(customerTotal)}</span>
          </div>
          {customerPayments.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No customer payments recorded yet.</p>
          ) : (
            <div className="mt-3">
              <DataTable columns={billingPaymentColumns} rows={customerPayments} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
