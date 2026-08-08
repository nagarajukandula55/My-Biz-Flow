import type { Column, Row } from "@/components/DataTable";
import { LogoMark } from "@/components/LogoMark";
import { PrintButton } from "@/components/PrintButton";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { getDocumentTemplate, renderTemplate } from "@/lib/designer/documentTemplates";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";

/**
 * Renders a record as a real printable document — letterhead, fields laid
 * out as a document, not a re-skinned table. If a Super Admin has designed
 * a custom template for this page (via the Designer, see
 * src/lib/designer/documentTemplates.ts), that HTML (with {{placeholders}}
 * substituted) is used verbatim inside the print-safe frame below.
 * Otherwise falls back to a sensible default built from `columns`.
 *
 * @media print hides the AppShell chrome and the print button itself —
 * this is meant to be printed/saved as PDF via the browser's native
 * print dialog, not a hand-built PDF pipeline.
 *
 * The document number shown is the NUMBERING SYSTEM's token (Main scheme,
 * or this Vendor's override — src/lib/designer/numbering.ts), not the raw
 * sample record's `id` field. `sequenceIndex` (the record's position among
 * its module's sample rows, 0-based) is passed by the caller and used as
 * the sequence — a deterministic peek via formatNumber(), NOT
 * getNextNumber(): merely viewing a document must never consume/advance
 * the live counter, only actually issuing one should (there is no
 * "issue" action yet, since there's no database to persist which number
 * a real record was assigned).
 */
export function DocumentView({
  pageId,
  documentType,
  documentLabel,
  vendorName,
  vendorId,
  record,
  columns,
  sequenceIndex,
  lineItems,
}: {
  pageId: string;
  /** The numbering system's document-type id, e.g. "billing.document" — see NUMBERED_DOCUMENT_TYPES. */
  documentType: string;
  documentLabel: string;
  vendorName: string;
  vendorId: string;
  record: Row;
  columns: Column[];
  sequenceIndex: number;
  /** Optional itemized breakdown (currently: Billing invoices) — rendered
   * as its own table instead of the flat field grid when present and no
   * custom template overrides the layout. */
  lineItems?: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[];
}) {
  const customTemplate = getDocumentTemplate(pageId);
  const scheme = getEffectiveScheme(documentType, vendorId);
  const documentNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  const templateRecord = { ...record, documentNumber };

  return (
    <div className="mbf-page bg-bg-sunken">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-8 print:max-w-none print:py-0">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <div className="rounded-lg border border-border bg-bg-raised p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <span className="font-display text-lg font-extrabold text-text">{vendorName}</span>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-bold text-text">{documentLabel}</div>
              <div className="mt-0.5 font-mono text-xs text-text-muted">{documentNumber}</div>
            </div>
          </div>

          {customTemplate ? (
            <div
              className="mt-6"
              // Template is Super-Admin-authored and every substituted
              // value is HTML-escaped by renderTemplate() — see that
              // function's docs for why this is safe. templateRecord adds
              // {{documentNumber}} as an available placeholder alongside
              // the record's own fields.
              dangerouslySetInnerHTML={{ __html: renderTemplate(customTemplate, templateRecord) }}
            />
          ) : (
            <>
              <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
                {columns
                  .filter((c) => c.key !== "id" && c.key !== "lineItemsSummary")
                  .filter((c) => !(lineItems && lineItems.length > 0 && ["subtotal", "taxAmount", "totalAmount"].includes(c.key)))
                  .map((col) => (
                    <div key={col.key} className={col.type === "text" ? "col-span-2" : undefined}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {col.label}
                      </dt>
                      <dd
                        className={`mt-0.5 text-sm text-text ${
                          col.type === "currency" ? "font-mono tabular-nums" : ""
                        }`}
                      >
                        {formatFieldValue(col, record[col.key])}
                      </dd>
                    </div>
                  ))}
              </dl>

              {lineItems && lineItems.length > 0 && (
                <div className="mt-6">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2">Unit</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Tax %</th>
                        <th className="py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="py-2 text-text">{item.description}</td>
                          <td className="py-2 text-right font-mono tabular-nums text-text">{item.quantity}</td>
                          <td className="py-2 text-text">{item.unit}</td>
                          <td className="py-2 text-right font-mono tabular-nums text-text">
                            {formatCurrencyINR(item.unitPrice)}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums text-text">{item.taxRate}%</td>
                          <td className="py-2 text-right font-mono tabular-nums font-semibold text-text">
                            {formatCurrencyINR(item.quantity * item.unitPrice * (1 + item.taxRate / 100))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 flex justify-end">
                    <div className="w-full max-w-xs text-sm">
                      <div className="flex justify-between text-text-muted">
                        <span>Subtotal</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrencyINR(Number(record["subtotal"]) || 0)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex justify-between text-text-muted">
                        <span>Tax</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrencyINR(Number(record["taxAmount"]) || 0)}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-text">
                        <span>Total</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrencyINR(Number(record["totalAmount"]) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFieldValue(column: Column, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (column.type === "currency") return formatCurrencyINR(Number(value));
  if (column.type === "date") return formatDate(String(value));
  return String(value);
}
