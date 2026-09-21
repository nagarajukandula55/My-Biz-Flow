import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { computePartPlanningForecast, getForecastWindowDays } from "@/lib/inventoryForecast";
import { setForecastWindowAction } from "./actions";

registerPage({
  id: "inventory.part-planning.list",
  moduleSlug: "inventory",
  title: "Part Planning — Forecast",
  path: "/partner/[partnerId]/inventory/part-planning",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "forecast", label: "Reorder forecast" }],
  explanation:
    "Reorder forecast for parts, over a partner-configurable window (default 30 days, editable below). For each material consumed at least once in the window, computes a daily usage rate from real Parts Consumption history (deductInventoryForWorkorderAction), projects days-of-stock-left from current Good Available Qty, and suggests a pre-order quantity (one window's worth of projected usage minus what's already on hand) — flagged 'Reorder soon' once projected stock-out is inside half the window. Setting the window to 20 days re-runs the same math over the last 20 days of consumption and forecasts 20 days ahead instead of 30.",
  sourceFile: "src/app/partner/[partnerId]/inventory/part-planning/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartPlanningPage({ params }: { params: { partnerId: string } }) {
  const windowDays = await getForecastWindowDays(params.partnerId);
  const forecast = await computePartPlanningForecast(params.partnerId, windowDays);
  const reorderSoonCutoff = Math.max(1, Math.round(windowDays / 2));

  return (
    <AppShell topbarTitle="Part Planning">
      <div>
        <p className="text-sm text-text-muted">
          Forecasts how long current stock will last and what to pre-order, based on real consumption over the last{" "}
          {windowDays} day{windowDays === 1 ? "" : "s"}.
        </p>

        <form action={setForecastWindowAction.bind(null, params.partnerId)} className="mt-4 flex items-end gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Forecast Window (days)
            <input
              type="number"
              name="windowDays"
              min={1}
              defaultValue={windowDays}
              className="mt-1 block w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <button type="submit" className="btn-accent">
            Apply
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Materials Forecasted" value={String(forecast.length)} />
          <DashboardWidget
            label="Reorder Soon"
            value={String(forecast.filter((f) => f.daysLeft <= reorderSoonCutoff).length)}
            neon={forecast.some((f) => f.daysLeft <= reorderSoonCutoff)}
          />
          <DashboardWidget label="Total Suggested Pre-Order Qty" value={String(forecast.reduce((s, f) => s + f.suggestedReorderQty, 0))} />
        </div>

        {forecast.length === 0 ? (
          <p className="mt-6 text-sm text-text-muted">
            No parts consumed in the last {windowDays} days — nothing to forecast yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2.5">Material</th>
                  <th className="px-3 py-2.5 text-right">Used ({windowDays}d)</th>
                  <th className="px-3 py-2.5 text-right">On Hand (Good)</th>
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
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        f.daysLeft <= reorderSoonCutoff ? "font-semibold text-danger" : "text-text"
                      }`}
                    >
                      {Number.isFinite(f.daysLeft) ? f.daysLeft : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.suggestedReorderQty || "—"}</td>
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
