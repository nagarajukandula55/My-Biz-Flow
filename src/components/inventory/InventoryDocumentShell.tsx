import type { ReactNode } from "react";
import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";
import { formatDate } from "@/lib/format";

/**
 * Shared letterhead + print-frame shell for every Inventory transaction
 * document (Stock Take, Stock Transfers, Stock Adjustments, Return
 * Orders, Part Orders) — deliberately mirrors
 * billing/[recordId]/document/BillingInvoiceDocument.tsx's header/meta-box
 * layout and print CSS approach (rounded card, PrintFrame A4/A5 toggle,
 * PrintButton) so every printable document in the app looks the same,
 * rather than inventing a second print style. Inventory documents have no
 * GST/Bill-To/bank/UPI concerns, so this shell only carries the parts that
 * ARE shared: partner letterhead block + a document-number/date meta box.
 * Each transaction type supplies its own body (warehouse/status grid +
 * line-items table + totals) as children.
 */
export function InventoryDocumentShell({
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  title,
  documentNumber,
  documentDate,
  metaRows,
  children,
}: {
  partnerName: string;
  partnerGstin?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerCity?: string;
  partnerState?: string;
  partnerPincode?: string;
  title: string;
  documentNumber: string;
  documentDate: string;
  /** Extra rows rendered under the Document No / Date meta box (e.g. Status). */
  metaRows?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mbf-page bg-bg-sunken">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-8 print:max-w-none print:py-0">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <PrintFrame sizes={["a4", "a5"]}>
          <div className="rounded-lg border border-border bg-bg-raised p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <h1 className="text-center font-display text-xl font-bold tracking-wide text-text">{title}</h1>

            <div className="mt-6 flex items-start justify-between gap-6">
              <div className="rounded-md bg-bg-sunken px-4 py-3">
                <div className="font-display text-base font-bold text-text">{partnerName}</div>
                {partnerAddress && <div className="mt-1 whitespace-pre-line text-xs text-text-muted">{partnerAddress}</div>}
                {(partnerCity || partnerState || partnerPincode) && (
                  <div className="text-xs text-text-muted">
                    {[partnerCity, partnerState].filter(Boolean).join(", ")}
                    {partnerPincode ? ` — ${partnerPincode}` : ""}
                  </div>
                )}
                {partnerGstin && <div className="mt-1 text-xs text-text-muted">GSTIN: {partnerGstin}</div>}
                <div className="text-xs text-text-muted">Phone: {partnerPhone || "—"}</div>
              </div>
              <div className="rounded-md border border-border px-4 py-3 text-right text-xs text-text-muted">
                <div>
                  Document No: <span className="font-mono font-semibold text-text">{documentNumber}</span>
                </div>
                <div>
                  Date: <span className="font-semibold text-text">{formatDate(documentDate)}</span>
                </div>
                {metaRows}
              </div>
            </div>

            {children}

            <div className="mt-6 text-center text-xs text-text-muted">
              <div>This is a computer generated document from {partnerName}.</div>
            </div>
          </div>
        </PrintFrame>
      </div>
    </div>
  );
}
