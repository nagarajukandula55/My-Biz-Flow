import { formatCurrencyINR } from "@/lib/format";
import { InventoryDocumentShell } from "./InventoryDocumentShell";

/**
 * Part Order's printable document. A flat single-material record — see
 * getPartOrderFormFields/getPartOrderDetailFields in
 * src/lib/sample-data/warehouse.ts — so this renders a single-row table,
 * now including unit price/line total, since unitPrice is captured on
 * this module as of this build (Part Orders was also converted to a
 * multi-line create form via MaterialLineItemsTable, with each line
 * submitted as its own separate BusinessRecord — see
 * createPartOrdersMultiAction in actions.ts — same "flat record per row"
 * pattern as Stock Adjustments/Return Orders). Note: this document still
 * only ever covers the one record it was opened for, not the whole
 * multi-line submission.
 */
export function PartOrderDocument({
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  recordId,
  dispatchedDate,
  linkedReturnOrderId,
  materialId,
  quantity,
  unitPrice,
  sourceWarehouseName,
  destinationLocation,
  status,
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
  dispatchedDate: string;
  linkedReturnOrderId?: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  sourceWarehouseName?: string;
  destinationLocation?: string;
  status: string;
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
      title="PART ORDER"
      documentNumber={recordId}
      documentDate={dispatchedDate}
      metaRows={
        <div className="mt-1">
          Status: <span className="font-semibold text-text">{status}</span>
        </div>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Source Warehouse</div>
          <div className="mt-1 text-text">{sourceWarehouseName || "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Destination Location</div>
          <div className="mt-1 text-text">{destinationLocation || "—"}</div>
        </div>
        {linkedReturnOrderId && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Linked Return Order</div>
            <div className="mt-1 text-text">{linkedReturnOrderId}</div>
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
