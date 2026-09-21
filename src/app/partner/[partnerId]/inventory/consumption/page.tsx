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

export default async function ConsumptionPage({ params }: { params: { partnerId: string } }) {
  const [columns, rows] = await Promise.all([
    applyCustomizations("inventory.consumption.list", consumptionColumns),
    listBusinessRecords(params.partnerId, "inventory-consumption"),
  ]);

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  // Reversed lines (a cancelled/reopened workorder returning its parts —
  // see reverseConsumptionForWorkorder in the workorder actions) don't
  // count as real usage for the totals below, even though they still show
  // in the raw history table for audit purposes.
  const last30 = rows.filter((r) => {
    if (r["reversedAt"]) return false;
    const d = new Date(String(r["consumedDate"] ?? ""));
    return !Number.isNaN(d.getTime()) && now - d.getTime() <= THIRTY_DAYS_MS;
  });
  const totalQtyLast30 = last30.reduce((sum, r) => sum + Number(r["qty"] ?? 0), 0);
  const topConsumed = summarizeConsumptionByMaterial(last30).slice(0, 20);

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

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Lines Consumed (30d)" value={String(last30.length)} />
          <DashboardWidget label="Good Qty Consumed (30d)" value={String(totalQtyLast30)} />
          <DashboardWidget label="Defective Qty Generated (30d)" value={String(totalQtyLast30)} />
        </div>

        {topConsumed.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-text">Top Consumed Parts (30d)</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-3 py-2.5">Material</th>
                    <th className="px-3 py-2.5 text-right">Good Consumed (30d)</th>
                    <th className="px-3 py-2.5 text-right">Defective Generated (30d)</th>
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
