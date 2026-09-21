import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePosStaff } from "@/lib/pos/posAuth";
import type { SaleLine, Tender } from "@/lib/sample-data/pos";

registerPage({
  id: "pos.reports",
  moduleSlug: "pos",
  title: "POS — Reports",
  path: "/partner/[partnerId]/pos/reports",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Sales analytics across every Completed sale in the selected date range — revenue and count by outlet, by cashier, by payment mode, and the top products by quantity sold. Computed in-memory from real pos BusinessRecords (no separate reporting table). Voided sales are excluded entirely; a partial return's refunded amount is shown separately rather than netted against gross sales, so the report still shows what was actually rung up at the register.",
  sourceFile: "src/app/partner/[partnerId]/pos/reports/page.tsx",
});

export const dynamic = "force-dynamic";

function inRange(iso: string, from?: string, to?: string): boolean {
  if (!iso) return true;
  const date = iso.slice(0, 10);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default async function PosReportsPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string };
}) {
  await requirePosStaff(params.partnerId);
  const { from, to } = searchParams ?? {};

  const [allSales, allReturns] = await Promise.all([
    listBusinessRecords(params.partnerId, "pos"),
    listBusinessRecords(params.partnerId, "pos-returns"),
  ]);

  const sales = allSales.filter(
    (s) => s["status"] === "Completed" && inRange(String(s["transactionTimestamp"] ?? ""), from, to)
  );
  const returns = allReturns.filter((r) => inRange(String(r["returnedAt"] ?? ""), from, to));

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s["totalAmount"] ?? 0), 0);
  const totalRefunded = returns.reduce((sum, r) => sum + Number(r["refundAmount"] ?? 0), 0);
  const avgSale = sales.length > 0 ? totalRevenue / sales.length : 0;

  const byOutlet = new Map<string, { count: number; revenue: number }>();
  const byCashier = new Map<string, { count: number; revenue: number }>();
  const byPaymentMode = new Map<string, number>();
  const byProduct = new Map<string, { productName: string; qty: number; revenue: number }>();

  for (const s of sales) {
    const outlet = String(s["branch"] ?? "—");
    const outletEntry = byOutlet.get(outlet) ?? { count: 0, revenue: 0 };
    outletEntry.count += 1;
    outletEntry.revenue += Number(s["totalAmount"] ?? 0);
    byOutlet.set(outlet, outletEntry);

    const cashier = String(s["cashier"] ?? "—");
    const cashierEntry = byCashier.get(cashier) ?? { count: 0, revenue: 0 };
    cashierEntry.count += 1;
    cashierEntry.revenue += Number(s["totalAmount"] ?? 0);
    byCashier.set(cashier, cashierEntry);

    const tenders = Array.isArray(s["tenders"]) ? (s["tenders"] as Tender[]) : [];
    for (const t of tenders) {
      byPaymentMode.set(t.method, (byPaymentMode.get(t.method) ?? 0) + Number(t.amount || 0));
    }

    const lines = Array.isArray(s["lines"]) ? (s["lines"] as SaleLine[]) : [];
    for (const line of lines) {
      const entry = byProduct.get(line.sku) ?? { productName: line.productName, qty: 0, revenue: 0 };
      entry.qty += line.qty;
      entry.revenue += Math.max(0, line.qty * line.unitPrice - (line.discount || 0));
      byProduct.set(line.sku, entry);
    }
  }

  const outletRows = Array.from(byOutlet.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  const cashierRows = Array.from(byCashier.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  const paymentRows = Array.from(byPaymentMode.entries()).sort((a, b) => b[1] - a[1]);
  const topProducts = Array.from(byProduct.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15);

  return (
    <AppShell topbarTitle="POS Reports">
      <div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input type="date" name="from" defaultValue={from ?? ""} className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-accent" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input type="date" name="to" defaultValue={to ?? ""} className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-accent" />
          </label>
          <button type="submit" className="btn-outline">Apply</button>
          {(from || to) && <a href={`/partner/${params.partnerId}/pos/reports`} className="btn-outline">Clear</a>}
        </form>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DashboardWidget label="Sales" value={String(sales.length)} />
          <DashboardWidget label="Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
          <DashboardWidget label="Avg Sale Value" value={`₹${Math.round(avgSale).toLocaleString("en-IN")}`} />
          <DashboardWidget label="Refunded" value={`₹${totalRefunded.toLocaleString("en-IN")}`} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-text">By Outlet</div>
            <ReportTable rows={outletRows.map(([name, v]) => [name, String(v.count), `₹${v.revenue.toLocaleString("en-IN")}`])} headers={["Outlet", "Sales", "Revenue"]} />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-text">By Cashier</div>
            <ReportTable rows={cashierRows.map(([name, v]) => [name, String(v.count), `₹${v.revenue.toLocaleString("en-IN")}`])} headers={["Cashier", "Sales", "Revenue"]} />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-text">By Payment Mode</div>
            <ReportTable rows={paymentRows.map(([method, amount]) => [method, `₹${amount.toLocaleString("en-IN")}`])} headers={["Method", "Amount"]} />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-text">Top Products</div>
            <ReportTable rows={topProducts.map((p) => [p.productName, String(p.qty), `₹${p.revenue.toLocaleString("en-IN")}`])} headers={["Product", "Qty Sold", "Revenue"]} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="rounded-md border border-dashed border-border bg-bg-raised p-4 text-center text-sm text-text-muted">No data for this range.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            {headers.map((h, i) => (
              <th key={h} className={`px-3 py-2.5 ${i > 0 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j > 0 ? "text-right tabular-nums" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
