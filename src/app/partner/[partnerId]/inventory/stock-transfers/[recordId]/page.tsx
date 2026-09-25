import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { StatusChip } from "@/components/StatusChip";
import {
  getStockTransferDetailFields,
  getStockTransferTimeline,
  stockTransferRelated,
  stockTransferColumns,
  type StockTransferLineItem,
} from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { StockTransferReconcileGate } from "./StockTransferReconcileGate";

registerPage({
  id: "inventory.stock-transfers.detail",
  moduleSlug: "inventory",
  title: "Stock Transfers — Detail",
  path: "/partner/[partnerId]/inventory/stock-transfers/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation:
    "Read-only detail view of a single stock transfer. An own-warehouse (intra-partner) transfer is now a multi-line document (line items shown here) that stays Pending until its OTP-gated Reconcile/Confirm action moves real Stock. A partner-to-partner transfer keeps its original single-field layout and shows 'Pending Super Admin Approval' until approved from My-Biz-Flow-Admin's /admin/stock-transfers queue — untouched by this multi-line change.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-transfers/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTransferDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-transfers", params.recordId);
  if (!record) notFound();
  const recordLabel = String(record["id"] ?? params.recordId);
  const lineItems = record["lineItems"] as StockTransferLineItem[] | undefined;

  // Own-warehouse (intra-partner) multi-line documents carry a lineItems
  // array (see createOwnWarehouseTransferCore, actions.ts) — rendered here
  // as its own line-items table plus the OTP Reconcile/Confirm gate. A
  // partner-to-partner transfer never has lineItems and falls through to
  // the original flat RecordDetail rendering below, completely untouched.
  if (Array.isArray(lineItems)) {
    const status = String(record["status"] ?? "Pending");
    return (
      <AppShell topbarTitle="Stock Transfers">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
              <p className="mt-1 text-xs text-text-muted">Stock transfer detail (own warehouses)</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/partner/${params.partnerId}/inventory/stock-transfers/${params.recordId}/document`} className="btn-outline">
                View document
              </Link>
              <Link href={`/partner/${params.partnerId}/inventory/stock-transfers`} className="btn-outline">
                &larr; Back
              </Link>
            </div>
          </div>

          {searchParams?.created && (
            <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600">
              Transfer created — still Pending until confirmed.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-bg-raised p-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">From Warehouse</div>
              <div className="mt-1 text-text">{String(record["fromWarehouseName"] ?? "—")}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">To Warehouse</div>
              <div className="mt-1 text-text">{String(record["toWarehouseName"] ?? "—")}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Transfer Date</div>
              <div className="mt-1 text-text">{String(record["transferDate"] ?? "—")}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">Status</div>
              <div className="mt-1">
                <StatusChip label={status} variant={status === "Completed" ? "success" : "warning"} />
              </div>
            </div>
            {record["reason"] ? (
              <div className="col-span-full">
                <div className="text-xs uppercase tracking-wide text-text-muted">Reason / Note</div>
                <div className="mt-1 text-text">{String(record["reason"])}</div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-text">Line items</h2>
            {status === "Pending" && (
              <StockTransferReconcileGate partnerId={params.partnerId} recordId={params.recordId} recordLabel={recordLabel} />
            )}
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg-raised">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2.5">Material</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5 text-right">Quantity</th>
                  <th className="px-3 py-2.5 text-right">Unit Price (₹)</th>
                  <th className="px-3 py-2.5">Serials</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-xs text-text-muted">
                      No line items.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((line, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-text">{line.materialId}</td>
                      <td className="px-3 py-2 text-text">{line.condition}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text">{line.quantity}</td>
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

  // Partner-to-partner (or any legacy flat-shaped) record — original
  // RecordDetail rendering, unchanged.
  const fields = await applyCustomizationsToDetailFields(
    "inventory.stock-transfers.detail",
    getStockTransferDetailFields(record),
    stockTransferColumns
  );
  const timeline = getStockTransferTimeline(record);

  return (
    <AppShell topbarTitle="Stock Transfers">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={stockTransferRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Stock transfer detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/inventory/stock-transfers/${params.recordId}/document`} className="btn-outline">
                  View document
                </Link>
                <Link href={`/partner/${params.partnerId}/inventory/stock-transfers`} className="btn-outline">
                  &larr; Back
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
