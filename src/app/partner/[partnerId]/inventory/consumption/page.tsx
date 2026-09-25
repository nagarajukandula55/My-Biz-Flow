import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { listBusinessRecords } from "@/lib/businessRecords";
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
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Real per-workorder Parts Consumption history — one row per part line actually deducted from Stock by deductInventoryForWorkorderAction, not sample data. Read-only, no create form (the only way a row here exists is a real workorder closing and consuming real stock). Every Good unit consumed here also generates one Defective unit of the same material in Inventory > Stock (the old/faulty part that came out of the repair) — the totals below split consumption two ways: Good pulled from stock vs. Defective generated. For the forward-looking reorder forecast, see Inventory > Part Planning.",
  sourceFile: "src/app/partner/[partnerId]/inventory/consumption/page.tsx",
});

export const dynamic = "force-dynamic";

function inRange(dateStr: string, from?: string, to?: string): boolean {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  const key = d.toISOString().slice(0, 10);
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export default async function ConsumptionPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string; warehouseName?: string; materialId?: string };
}) {
  const { from, to, warehouseName, materialId } = searchParams ?? {};
  const [columns, allRows] = await Promise.all([
    applyCustomizations("inventory.consumption.list", consumptionColumns),
    listBusinessRecords(params.partnerId, "inventory-consumption"),
  ]);

  // Filter dimensions available on this module's own data shape (see
  // consumptionColumns above) — date range, warehouse, and material.
  // sourceType has no counterpart here (every row here already IS a
  // workorder-consumption source), so it's intentionally not offered.
  const warehouseOptions = Array.from(
    new Set(allRows.map((r) => String(r["warehouseName"] ?? "").trim()).filter(Boolean))
  ).sort();
  const materialOptions = Array.from(
    new Set(allRows.map((r) => String(r["materialId"] ?? "").trim()).filter(Boolean))
  ).sort();

  // Single filtered query — both the summary cards below AND the table
  // derive from this same `rows`, so the cards always match what's shown.
  const rows = allRows.filter((r) => {
    if (r["reversedAt"]) return false;
    if (!inRange(String(r["consumedDate"] ?? ""), from, to)) return false;
    if (warehouseName && String(r["warehouseName"] ?? "") !== warehouseName) return false;
    if (materialId && String(r["materialId"] ?? "") !== materialId) return false;
    return true;
  });
  const totalQty = rows.reduce((sum, r) => sum + Number(r["qty"] ?? 0), 0);
  const topConsumed = summarizeConsumptionByMaterial(rows).slice(0, 20);
  const hasFilters = !!(from || to || warehouseName || materialId);
  const clearHref = `/partner/${params.partnerId}/inventory/consumption`;

  return (
    <AppShell topbarTitle="Parts Consumption">
      <div>
        <p className="text-sm text-text-muted">
          Real usage history from closed workorders — what actually left Stock as Good, and the matching Defective
          units it generated. For the forward-looking reorder forecast, see{" "}
          <Link href={`/partner/${params.partnerId}/inventory/part-planning`} className="text-accent hover:underline">
            Part Planning
          </Link>
          .
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Warehouse</span>
            <select
              name="warehouseName"
              defaultValue={warehouseName ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            >
              <option value="">All</option>
              {warehouseOptions.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Material</span>
            <select
              name="materialId"
              defaultValue={materialId ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            >
              <option value="">All</option>
              {materialOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-outline">Apply</button>
          {hasFilters && (
            <a href={clearHref} className="btn-outline">Clear</a>
          )}
        </form>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Lines Consumed" value={String(rows.length)} />
          <DashboardWidget label="Good Qty Consumed" value={String(totalQty)} />
          <DashboardWidget label="Defective Qty Generated" value={String(totalQty)} />
        </div>

        {topConsumed.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-text">Top Consumed Parts</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-3 py-2.5">Material</th>
                    <th className="px-3 py-2.5 text-right">Good Consumed</th>
                    <th className="px-3 py-2.5 text-right">Defective Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {topConsumed.map((m) => (
                    <tr key={m.materialId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{m.materialId}</span> {m.materialLabel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.totalQty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.totalQty}</td>
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
