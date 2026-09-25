import { formatCurrencyINR } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { InventoryDocumentShell } from "./InventoryDocumentShell";
import { RETURN_STATUS_VARIANT } from "@/lib/sample-data/warehouse";

/**
 * Return Order's printable document. Like Stock Adjustments, a Return
 * Order is a flat single-material record in this repo's actual schema, so
 * this renders a single-row table — now including unit price/line total,
 * since unitPrice is captured on this module as of this build. Status is
 * always shown (the record is locked once it reaches one of
 * RETURN_ORDER_FINAL_STATUSES — see the detail page) but no special
 * "Reconciled"/"Confirmed" stamp is drawn here, since that stamp is
 * scoped to Stock Take/Stock Transfer only per spec. Note: a multi-line
 * submission on the create form becomes several sibling records, one per
 * line — this document still only ever covers the one record it was
 * opened for, not the whole submission.
 */
export function ReturnOrderDocument({
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  recordId,
  createdDate,
  direction,
  returnType,
  materialId,
  quantity,
  unitPrice,
  sourceLocation,
  destinationWarehouseName,
  vendorName,
  challanNumber,
  status,
}: {
  partnerName: string;
  partnerGstin?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerCity?: string;
  partnerState?: string;
  partnerPincode?: string;
  recordId: string;
  createdDate: string;
  direction: string;
  returnType?: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  sourceLocation?: string;
  destinationWarehouseName?: string;
  vendorName?: string;
  challanNumber?: string;
  status: string;
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
      title="RETURN ORDER"
      documentNumber={recordId}
      documentDate={createdDate}
      metaRows={
        <div className="mt-1">
          Direction: <span className="font-semibold text-text">{direction}</span>
        </div>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Source Location</div>
          <div className="mt-1 text-text">{sourceLocation || "—"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {direction === "Outbound" ? "Vendor / OEM" : "Destination Warehouse"}
          </div>
          <div className="mt-1 text-text">{(direction === "Outbound" ? vendorName : destinationWarehouseName) || "—"}</div>
        </div>
        {direction === "Outbound" && challanNumber && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Challan / Delivery Note No.</div>
            <div className="mt-1 text-text">{challanNumber}</div>
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</div>
          <div className="mt-1">
            <StatusChip label={status} variant={RETURN_STATUS_VARIANT[status] ?? "neutral"} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Line Item</div>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-sunken text-left uppercase tracking-wide text-text-muted">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Material</th>
              <th className="px-2 py-2">Return Type</th>
              <th className="px-2 py-2 text-right">Quantity</th>
              <th className="px-2 py-2 text-right">Unit Price</th>
              <th className="px-2 py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border last:border-b-0">
              <td className="px-2 py-2 text-text-muted">1</td>
              <td className="px-2 py-2 text-text">{materialId || "—"}</td>
              <td className="px-2 py-2 text-text-muted">{returnType || "—"}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{quantity}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(unitPrice)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                {formatCurrencyINR(quantity * unitPrice)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </InventoryDocumentShell>
  );
}
