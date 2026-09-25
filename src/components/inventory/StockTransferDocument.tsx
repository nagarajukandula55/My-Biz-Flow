import { formatCurrencyINR } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { InventoryDocumentShell } from "./InventoryDocumentShell";
import type { StockTransferLineItem } from "@/lib/sample-data/warehouse";

/**
 * Stock Transfer's printable document. Handles BOTH record shapes that
 * genuinely exist for this module (see stock-transfers/[recordId]/page.tsx,
 * which branches the same way):
 *  - Own-warehouse (intra-partner) multi-line transfer: `lineItems` is an
 *    array (materialId/quantity/condition/unitPrice/serialNumbers per row).
 *  - Legacy partner-to-partner transfer: no `lineItems` at all — a single
 *    flat materialId/quantity record with no unit price ever captured, so
 *    this renders a simple single-line fallback row with no price/total
 *    columns rather than inventing a price.
 * "Confirmed" stamp only applies to the own-warehouse path (status
 * "Completed", set by the OTP-gated Reconcile/Confirm action) — a
 * partner-to-partner transfer's approval lives in My-Biz-Flow-Admin, out
 * of scope here. No HSN column: line items only ever carry a bare
 * materialId string, never an hsnCode.
 */
export function StockTransferDocument({
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  recordId,
  transferDate,
  status,
  fromWarehouseName,
  toWarehouseName,
  toPartnerId,
  reason,
  lineItems,
  flatMaterialId,
  flatQuantity,
}: {
  partnerName: string;
  partnerGstin?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerCity?: string;
  partnerState?: string;
  partnerPincode?: string;
  recordId: string;
  transferDate: string;
  status: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  toPartnerId?: string;
  reason?: string;
  /** Own-warehouse multi-line shape — undefined for a legacy flat/partner-to-partner record. */
  lineItems?: StockTransferLineItem[];
  /** Legacy flat-shape fallback fields — only meaningful when lineItems is undefined. */
  flatMaterialId?: string;
  flatQuantity?: number;
}) {
  const isMultiLine = Array.isArray(lineItems);
  const isConfirmed = isMultiLine && status === "Completed";
  const totalValue = isMultiLine ? lineItems!.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) : undefined;

  return (
    <InventoryDocumentShell
      partnerName={partnerName}
      partnerGstin={partnerGstin}
      partnerPhone={partnerPhone}
      partnerAddress={partnerAddress}
      partnerCity={partnerCity}
      partnerState={partnerState}
      partnerPincode={partnerPincode}
      title="STOCK TRANSFER"
      documentNumber={recordId}
      documentDate={transferDate}
      metaRows={
        <div className="mt-1">
          Status: <span className="font-semibold text-text">{status}</span>
        </div>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">From Warehouse</div>
          <div className="mt-1 text-text">{fromWarehouseName || "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {toPartnerId ? "To Partner" : "To Warehouse"}
          </div>
          <div className="mt-1 text-text">{toPartnerId || toWarehouseName || "—"}</div>
        </div>
        {reason && (
          <div className="col-span-full">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Reason / Note</div>
            <div className="mt-1 text-text">{reason}</div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Line Items</div>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-sunken text-left uppercase tracking-wide text-text-muted">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Material</th>
              {isMultiLine && <th className="px-2 py-2">Type</th>}
              <th className="px-2 py-2 text-right">Quantity</th>
              {isMultiLine && <th className="px-2 py-2 text-right">Unit Price</th>}
              {isMultiLine && <th className="px-2 py-2 text-right">Line Total</th>}
            </tr>
          </thead>
          <tbody>
            {isMultiLine ? (
              lineItems!.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-text-muted">
                    No line items.
                  </td>
                </tr>
              ) : (
                lineItems!.map((line, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="px-2 py-2 text-text-muted">{i + 1}</td>
                    <td className="px-2 py-2 text-text">{line.materialId}</td>
                    <td className="px-2 py-2 text-text-muted">{line.condition}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{line.quantity}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(line.unitPrice)}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                      {formatCurrencyINR(line.quantity * line.unitPrice)}
                    </td>
                  </tr>
                ))
              )
            ) : (
              <tr className="border-b border-border last:border-b-0">
                <td className="px-2 py-2 text-text-muted">1</td>
                <td className="px-2 py-2 text-text">{flatMaterialId || "—"}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{flatQuantity ?? "—"}</td>
              </tr>
            )}
          </tbody>
        </table>
        {!isMultiLine && (
          <p className="mt-1 text-[11px] text-text-muted">No unit price is captured for this transfer type.</p>
        )}
      </div>

      {isMultiLine && (
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs rounded-md border border-border bg-bg-sunken p-4 text-sm">
            <div className="flex justify-between text-base font-bold text-text">
              <span>Total Value</span>
              <span className="font-mono tabular-nums">{formatCurrencyINR(totalValue ?? 0)}</span>
            </div>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-6 flex justify-end">
          <div className="rounded-md border-2 border-emerald-500/40 px-4 py-2 text-right">
            <StatusChip label="Confirmed" variant="success" />
            <div className="mt-1 text-[11px] text-text-muted">Applied to Stock, ageing/FIFO and the Inventory ledger.</div>
          </div>
        </div>
      )}
    </InventoryDocumentShell>
  );
}
