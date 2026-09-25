import { formatCurrencyINR } from "@/lib/format";
import { InventoryDocumentShell } from "./InventoryDocumentShell";

/**
 * Stock Adjustment's printable document. A Stock Adjustment is a flat,
 * single-material record in this repo's actual current schema (each
 * "line" added on the create form via MaterialLineItemsTable is submitted
 * as its OWN separate BusinessRecord — see createStockAdjustmentsMultiAction
 * in actions.ts — not embedded as a lineItems[] array on one record), so
 * this renders a single-row table — now including unit price/line total,
 * since unitPrice is captured on this module as of this build. Note: a
 * multi-line submission on the create form becomes several sibling
 * records, one per line — this document still only ever covers the one
 * record it was opened for, not the whole submission.
 */
export function StockAdjustmentDocument({
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  recordId,
  date,
  warehouseName,
  materialId,
  adjustmentType,
  quantity,
  unitPrice,
  reason,
  adjustedBy,
  serialNumbers,
}: {
  partnerName: string;
  partnerGstin?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerCity?: string;
  partnerState?: string;
  partnerPincode?: string;
  recordId: string;
  date: string;
  warehouseName: string;
  materialId: string;
  adjustmentType: string;
  quantity: number;
  unitPrice: number;
  reason?: string;
  adjustedBy?: string;
  serialNumbers?: string[];
}) {
  return (
    <InventoryDocumentShell
      partnerName={partnerName}
      partnerGstin={partnerGstin}
      partnerPhone={partnerPhone}
      partnerAddress={partnerAddress}
      partnerCity={partnerCity}
      partnerState={partnerState}
      partnerPincode={partnerPincode}
      title="STOCK ADJUSTMENT"
      documentNumber={recordId}
      documentDate={date}
      metaRows={
        <div className="mt-1">
          Type: <span className="font-semibold text-text">{adjustmentType}</span>
        </div>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Warehouse</div>
          <div className="mt-1 text-text">{warehouseName || "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Adjusted By</div>
          <div className="mt-1 text-text">{adjustedBy || "—"}</div>
        </div>
        {reason && (
          <div className="col-span-full">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Reason</div>
            <div className="mt-1 text-text">{reason}</div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Line Item</div>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-sunken text-left uppercase tracking-wide text-text-muted">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Material</th>
              <th className="px-2 py-2 text-right">Quantity</th>
              <th className="px-2 py-2 text-right">Unit Price</th>
              <th className="px-2 py-2 text-right">Line Total</th>
              <th className="px-2 py-2">Serials</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border last:border-b-0">
              <td className="px-2 py-2 text-text-muted">1</td>
              <td className="px-2 py-2 text-text">{materialId || "—"}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{quantity}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(unitPrice)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                {formatCurrencyINR(quantity * unitPrice)}
              </td>
              <td className="px-2 py-2 text-text-muted">
                {serialNumbers && serialNumbers.length > 0 ? serialNumbers.join(", ") : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </InventoryDocumentShell>
  );
}
