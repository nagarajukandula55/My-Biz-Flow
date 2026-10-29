import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { registerPage } from "@/lib/designer/registry";
import { prisma } from "@/lib/prisma";

registerPage({
  id: "inventory.lots",
  moduleSlug: "inventory",
  title: "Lot & Serial Traceability",
  path: "/partner/[partnerId]/inventory/lots",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "filters", label: "Traceability filters" }],
  explanation:
    "Read-only traceability view for tracked material lots and serialized units. It shows remaining quantity, warehouse, condition, receipt source, age, batch/serial number, and source record without changing stock. This is the safe operational view for barcode/serial lookups while existing audited stock flows remain authoritative.",
  sourceFile: "src/app/partner/[partnerId]/inventory/lots/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function InventoryLotsPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { q?: string } }) {
  const query = String(searchParams?.q ?? "").trim().toLowerCase();
  const lots = await prisma.stockLot.findMany({
    where: { partnerId: params.partnerId },
    orderBy: [{ quantityRemaining: "desc" }, { receivedAt: "desc" }],
    take: 500,
  });
  const activeLots = lots.filter((lot) => {
    if (lot.quantityRemaining <= 0) return false;
    if (!query) return true;
    return [lot.materialId, lot.materialLabel, lot.serialNumber, lot.warehouseName, lot.sourceRecordId]
      .some((value) => String(value ?? "").toLowerCase().includes(query));
  });
  const serialized = activeLots.filter((lot) => lot.serialized).length;
  const trackedQuantity = activeLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
  const now = Date.now();

  return (
    <AppShell topbarTitle="Lot & Serial Traceability">
      <div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Active Lots" value={String(activeLots.length)} />
          <DashboardWidget label="Serialized Units" value={String(serialized)} />
          <DashboardWidget label="Tracked Qty Remaining" value={String(trackedQuantity)} />
        </div>
        <form method="get" className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input name="q" defaultValue={searchParams?.q ?? ""} className="input flex-1" placeholder="Search material, barcode/serial, warehouse or source" aria-label="Search lots" />
          <button className="btn-outline" type="submit">Search</button>
          {query && <a className="btn-outline" href={`/partner/${params.partnerId}/inventory/lots`}>Clear</a>}
        </form>
        {query && <p className="mt-2 text-sm text-text-muted">Showing active records matching “{searchParams?.q}”.</p>}
        <div className="mt-6 overflow-x-auto rounded-md border border-border bg-bg-raised">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-3">Material</th>
                <th className="px-3 py-3">Batch / Serial</th>
                <th className="px-3 py-3">Warehouse</th>
                <th className="px-3 py-3">Condition</th>
                <th className="px-3 py-3 text-right">Remaining</th>
                <th className="px-3 py-3">Received</th>
                <th className="px-3 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {activeLots.map((lot) => {
                const ageDays = Math.max(0, Math.floor((now - lot.receivedAt.getTime()) / 86400000));
                return (
                  <tr key={lot.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-3 text-text">
                      <div className="font-medium">{lot.materialLabel}</div>
                      <div className="text-xs text-text-muted">{lot.materialId}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-text">{lot.serialNumber ?? `Lot ${lot.id.slice(-8)}`}</td>
                    <td className="px-3 py-3 text-text">{lot.warehouseName}</td>
                    <td className="px-3 py-3 text-text">{lot.condition}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-text">{lot.quantityRemaining}</td>
                    <td className="px-3 py-3 text-text-muted">{lot.receivedAt.toISOString().slice(0, 10)} ({ageDays}d)</td>
                    <td className="px-3 py-3 text-text-muted">{lot.sourceType ?? "—"}{lot.sourceRecordId ? ` · ${lot.sourceRecordId}` : ""}</td>
                  </tr>
                );
              })}
              {activeLots.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-text-muted">No tracked lots or serialized units remain.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {lots.length === 500 && <p className="mt-3 text-xs text-text-muted">Showing the latest 500 tracked lot records. Use the stock and transaction exports for a complete ledger.</p>}
      </div>
    </AppShell>
  );
}
