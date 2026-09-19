import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getAvailabilityByMaterial } from "@/lib/inventoryStock";
import { applyCustomizations } from "@/lib/designer/customizations";
import { consumptionColumns, summarizeConsumptionByMaterial } from "@/lib/sample-data/consumption";
import { ConsumptionClientTable } from "./ConsumptionClientTable";

registerPage({
  id: "inventory.consumption.list",
  moduleSlug: "inventory",
  title: "Parts Consumption — List",
  path: "/partner/[partnerId]/inventory/consumption",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "forecast", label: "30-day reorder forecast" },
  ],
  explanation:
    "Real per-workorder Parts Consumption history — one row per part line actually deducted from Stock by deductInventoryForWorkorderAction, not sample data. Read-only, no create form (the only way a row here exists is a real workorder closing and consuming real stock). Includes a 30-day reorder forecast: for each material with any consumption in the last 30 days, computes a daily usage rate, projects days-of-stock-left from current Available Qty, and suggests a pre-order quantity (30 days of projected usage minus what's already on hand) — flagged as 'Reorder soon' once projected stock-out is inside 14 days. Lets a partner plan Part Orders ahead of an actual shortage instead of only reacting to Stock hitting its Reorder Level.",
  sourceFile: "src/app/partner/[partnerId]/inventory/consumption/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ConsumptionPage({ params }: { params: { partnerId: string } }) {
  const [columns, rows, availability] = await Promise.all([
    applyCustomizations("inventory.consumption.list", consumptionColumns),
    listBusinessRecords(params.partnerId, "inventory-consumption"),
    getAvailabilityByMaterial(params.partnerId),
  ]);

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  // Reversed lines (a cancelled/reopened workorder returning its parts —
  // see reverseConsumptionForWorkorder in the workorder actions) don't
  // count as real usage for the totals/forecast below, even though they
  // still show in the raw history table for audit purposes.
  const last30 = rows.filter((r) => {
    if (r["reversedAt"]) return false;
    const d = new Date(String(r["consumedDate"] ?? ""));
    return !Number.isNaN(d.getTime()) && now - d.getTime() <= THIRTY_DAYS_MS;
  });
  const totalQtyLast30 = last30.reduce((sum, r) => sum + Number(r["qty"] ?? 0), 0);
  const topConsumed = summarizeConsumptionByMaterial(last30).slice(0, 20);

  // Rough forecast, not a statistical model: daily rate = 30-day total / 30,
  // days-left = current stock / daily rate (Infinity when nothing's been
  // consumed recently), suggested pre-order = 30 days of projected usage
  // minus what's already on hand, floored at 0 (never suggests ordering
  // less than zero for something already well-stocked).
  const forecast = topConsumed.map((m) => {
    const dailyRate = m.totalQty / 30;
    // availability map is keyed by bare material code; materialId here is
    // already that same code (see deductInventoryForWorkorderAction).
    const availableText = availability.get(m.materialId) ?? "";
    const onHand = availableText
      ? availableText
          .split(", ")
          .reduce((sum, part) => sum + (Number(part.match(/:\s*(\d+)/)?.[1] ?? 0) || 0), 0)
      : 0;
    const daysLeft = dailyRate > 0 ? Math.round(onHand / dailyRate) : Infinity;
    const suggestedReorderQty = Math.max(0, Math.ceil(dailyRate * 30 - onHand));
    return { ...m, dailyRate, onHand, daysLeft, suggestedReorderQty };
  });

  return (
    <AppShell topbarTitle="Parts Consumption">
      <div>
        <p className="text-sm text-text-muted">
          Real usage history from closed workorders — what actually left Stock, and how fast, so parts can be
          ordered ahead of a shortage instead of reacting to one.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Lines Consumed (30d)" value={String(last30.length)} />
          <DashboardWidget label="Total Qty Consumed (30d)" value={String(totalQtyLast30)} />
          <DashboardWidget
            label="Reorder Soon"
            value={String(forecast.filter((f) => f.daysLeft <= 14).length)}
            neon={forecast.some((f) => f.daysLeft <= 14)}
          />
        </div>

        {forecast.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-text">30-Day Reorder Forecast</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-3 py-2.5">Material</th>
                    <th className="px-3 py-2.5 text-right">Used (30d)</th>
                    <th className="px-3 py-2.5 text-right">On Hand</th>
                    <th className="px-3 py-2.5 text-right">Days Left</th>
                    <th className="px-3 py-2.5 text-right">Suggested Pre-Order Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f) => (
                    <tr key={f.materialId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{f.materialId}</span> {f.materialLabel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.totalQty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.onHand}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${f.daysLeft <= 14 ? "font-semibold text-danger" : "text-text"}`}>
                        {Number.isFinite(f.daysLeft) ? f.daysLeft : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.suggestedReorderQty || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-text">Consumption History</div>
          <ConsumptionClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
