import { formatCurrencyINR } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { InventoryDocumentShell } from "./InventoryDocumentShell";
import type { StockTakeLineItem } from "@/lib/sample-data/warehouse";

/**
 * Stock Take's printable document — every counted line item (Expected /
 * Counted / Variance / Unit Price / line total) plus a "Reconciled" stamp
 * once the record has actually been reconciled (real Stock/ledger effect
 * applied via the OTP-gated Reconcile action — see
 * stock-take/actions.ts's reconcileStockTakeAction). No HSN column: this
 * repo's Inventory line items carry only a bare materialId string, never
 * an hsnCode — HSN exists solely on the BOM material catalog
 * (src/lib/sample-data/bom.ts), unlinked from a Stock Take line, so there
 * is no HSN data to print here.
 */
export function StockTakeDocument({
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  recordId,
  warehouseName,
  countedDate,
  countedBy,
  note,
  status,
  lineItems,
}: {
  partnerName: string;
  partnerGstin?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerCity?: string;
  partnerState?: string;
  partnerPincode?: string;
  recordId: string;
  warehouseName: string;
  countedDate: string;
  countedBy?: string;
  note?: string;
  status: string;
  lineItems: StockTakeLineItem[];
}) {
  const isReconciled = status === "Reconciled";
  const totalValue = lineItems.reduce((sum, l) => sum + l.countedQty * l.unitPrice, 0);

  return (
    <InventoryDocumentShell
      partnerName={partnerName}
      partnerGstin={partnerGstin}
      partnerPhone={partnerPhone}
      partnerAddress={partnerAddress}
      partnerCity={partnerCity}
      partnerState={partnerState}
      partnerPincode={partnerPincode}
      title="STOCK TAKE"
      documentNumber={recordId}
      documentDate={countedDate}
      metaRows={
        <div className="mt-1">
          Status: <span className="font-semibold text-text">{status}</span>
        </div>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Warehouse</div>
          <div className="mt-1 text-text">{warehouseName || "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Counted By</div>
          <div className="mt-1 text-text">{countedBy || "—"}</div>
        </div>
        {note && (
          <div className="col-span-full">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Note</div>
            <div className="mt-1 text-text">{note}</div>
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
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2 text-right">Expected</th>
              <th className="px-2 py-2 text-right">Counted</th>
              <th className="px-2 py-2 text-right">Variance</th>
              <th className="px-2 py-2 text-right">Unit Price</th>
              <th className="px-2 py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-text-muted">
                  No line items.
                </td>
              </tr>
            ) : (
              lineItems.map((line, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-2 text-text-muted">{i + 1}</td>
                  <td className="px-2 py-2 text-text">{line.materialId}</td>
                  <td className="px-2 py-2 text-text-muted">{line.condition}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{line.expectedQty}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{line.countedQty}</td>
                  <td className={`px-2 py-2 text-right font-mono tabular-nums ${line.variance < 0 ? "text-danger" : "text-text"}`}>
                    {line.variance > 0 ? `+${line.variance}` : line.variance}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(line.unitPrice)}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                    {formatCurrencyINR(line.countedQty * line.unitPrice)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs rounded-md border border-border bg-bg-sunken p-4 text-sm">
          <div className="flex justify-between text-base font-bold text-text">
            <span>Total Counted Value</span>
            <span className="font-mono tabular-nums">{formatCurrencyINR(totalValue)}</span>
          </div>
        </div>
      </div>

      {isReconciled && (
        <div className="mt-6 flex justify-end">
          <div className="rounded-md border-2 border-emerald-500/40 px-4 py-2 text-right">
            <StatusChip label="Reconciled" variant="success" />
            <div className="mt-1 text-[11px] text-text-muted">Applied to Stock, ageing/FIFO and the Inventory ledger.</div>
          </div>
        </div>
      )}
    </InventoryDocumentShell>
  );
}
