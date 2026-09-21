import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { StatusChip } from "@/components/StatusChip";
import { computeAgeingRows, getAgeingThresholdDays } from "@/lib/inventoryAgeing";
import { setAgeingThresholdAction } from "./actions";
import type { StatusVariant } from "@/components/StatusChip";

registerPage({
  id: "inventory.ageing.list",
  moduleSlug: "inventory",
  title: "Inventory — Material Ageing",
  path: "/partner/[partnerId]/inventory/ageing",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "threshold", label: "Ageing threshold" }],
  explanation:
    "How long each Stock row (Good AND Defective) has sat since it was last replenished — days since lastReceivedAt (only ever advanced by a genuine stock increase: Part Order receipt, Stock Adjustment increase, Return Order inbound, or a Stock Take counting more than expected — never reset by selling/consuming, see src/lib/inventoryStock.ts). Banded against a partner-configurable threshold (days, editable below, default 60): Fresh (under half the threshold), Watch (half to full threshold), Aging (at or past the threshold) — this is the report that answers 'which material has crossed the threshold'.",
  sourceFile: "src/app/partner/[partnerId]/inventory/ageing/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Fresh: "success",
  Watch: "warning",
  Aging: "danger",
};

export default async function InventoryAgeingPage({ params }: { params: { partnerId: string } }) {
  const thresholdDays = await getAgeingThresholdDays(params.partnerId);
  const rows = await computeAgeingRows(params.partnerId, thresholdDays);

  const aging = rows.filter((r) => r.status === "Aging");
  const watch = rows.filter((r) => r.status === "Watch");
  const agingQty = aging.reduce((s, r) => s + r.qtyOnHand, 0);

  return (
    <AppShell topbarTitle="Material Ageing">
      <div>
        <p className="text-sm text-text-muted">
          Stock sitting since it was last replenished, banded against a threshold you set — so slow-moving or
          forgotten material gets flagged before it becomes a write-off.
        </p>

        <form action={setAgeingThresholdAction.bind(null, params.partnerId)} className="mt-4 flex items-end gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Ageing Threshold (days)
            <input
              type="number"
              name="thresholdDays"
              min={1}
              defaultValue={thresholdDays}
              className="mt-1 block w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <button type="submit" className="btn-accent">
            Apply
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DashboardWidget label="Aging (crossed threshold)" value={String(aging.length)} neon={aging.length > 0} />
          <DashboardWidget label="Aging Qty" value={String(agingQty)} />
          <DashboardWidget label="Watch (past halfway)" value={String(watch.length)} />
          <DashboardWidget label="Total Rows Tracked" value={String(rows.length)} />
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No stock with a usable received date yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2.5">Material</th>
                  <th className="px-3 py-2.5">Warehouse</th>
                  <th className="px-3 py-2.5">Material Type</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5">Last Received</th>
                  <th className="px-3 py-2.5 text-right">Age (days)</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.stockId} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">{r.materialId}</td>
                    <td className="px-3 py-2">{r.warehouseName}</td>
                    <td className="px-3 py-2">{r.condition}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.qtyOnHand}</td>
                    <td className="px-3 py-2">{new Date(r.lastReceivedAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.ageDays}</td>
                    <td className="px-3 py-2">
                      <StatusChip label={r.status} variant={STATUS_VARIANT[r.status]} />
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
