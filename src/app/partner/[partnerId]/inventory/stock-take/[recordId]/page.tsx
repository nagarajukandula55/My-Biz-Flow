import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { getBusinessRecord } from "@/lib/businessRecords";
import type { StockTakeLineItem } from "@/lib/sample-data/warehouse";
import { StockTakeReconcileGate } from "./StockTakeReconcileGate";

registerPage({
  id: "inventory.stock-take.detail",
  moduleSlug: "inventory",
  title: "Stock Take — Detail",
  path: "/partner/[partnerId]/inventory/stock-take/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation:
    "Read-only detail view of a single Stock Take document — its header plus every counted line item. A Pending document shows an OTP-gated Reconcile action (Telegram code sent to the Owner) that, once verified, applies the count to real Stock, StockLot ageing/FIFO and the Inventory ledger.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-take/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTakeDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-take", params.recordId);
  if (!record) notFound();
  const recordLabel = String(record["id"] ?? params.recordId);
  const lineItems = (record["lineItems"] as StockTakeLineItem[] | undefined) ?? [];
  const status = String(record["status"] ?? "Pending");

  return (
    <AppShell topbarTitle="Stock Take">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
            <p className="mt-1 text-xs text-text-muted">Stock Take detail</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/partner/${params.partnerId}/inventory/stock-take/${params.recordId}/document`} className="btn-outline">
              View document
            </Link>
            <Link href={`/partner/${params.partnerId}/inventory/stock-take`} className="btn-outline">
              &larr; Back
            </Link>
          </div>
        </div>

        {searchParams?.created && (
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600">
            Stock Take saved — still Pending until reconciled.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-bg-raised p-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted">Warehouse</div>
            <div className="mt-1 text-text">{String(record["warehouseName"] ?? "—")}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted">Counted Date</div>
            <div className="mt-1 text-text">{String(record["countedDate"] ?? "—")}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted">Counted By</div>
            <div className="mt-1 text-text">{String(record["countedBy"] ?? "—")}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted">Status</div>
            <div className="mt-1">
              <StatusChip label={status} variant={status === "Reconciled" ? "success" : "warning"} />
            </div>
          </div>
          {record["note"] ? (
            <div className="col-span-full">
              <div className="text-xs uppercase tracking-wide text-text-muted">Note</div>
              <div className="mt-1 text-text">{String(record["note"])}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-text">Line items</h2>
          {status === "Pending" && (
            <StockTakeReconcileGate partnerId={params.partnerId} recordId={params.recordId} recordLabel={recordLabel} />
          )}
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Material</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5 text-right">Expected</th>
                <th className="px-3 py-2.5 text-right">Counted</th>
                <th className="px-3 py-2.5 text-right">Variance</th>
                <th className="px-3 py-2.5 text-right">Unit Price (₹)</th>
                <th className="px-3 py-2.5">Serials</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-xs text-text-muted">
                    No line items.
                  </td>
                </tr>
              ) : (
                lineItems.map((line, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-text">{line.materialId}</td>
                    <td className="px-3 py-2 text-text">{line.condition}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{line.expectedQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{line.countedQty}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${line.variance < 0 ? "text-danger" : "text-text"}`}>
                      {line.variance > 0 ? `+${line.variance}` : line.variance}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{line.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {line.serialNumbers.length > 0 ? line.serialNumbers.join(", ") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
