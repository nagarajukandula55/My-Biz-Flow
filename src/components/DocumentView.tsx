import type { Column, Row } from "@/components/DataTable";
import { LogoMark } from "@/components/LogoMark";
import { PrintButton } from "@/components/PrintButton";
import { PrintFrame, type PrintSize } from "@/components/PrintFrame";
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
 * or this Partner's override — src/lib/designer/numbering.ts), not the raw
 * sample record's `id` field. `sequenceIndex` (the record's position among
 * its module's sample rows, 0-based) is passed by the caller and used as
 * the sequence — a deterministic peek via formatNumber(), NOT
 * await getNextNumber(): merely viewing a document must never consume/advance
 * the live counter, only actually issuing one should (there is no
 * "issue" action yet, since there's no database to persist which number
 * a real record was assigned).
 */
export async function DocumentView({
  pageId,
  documentType,
  documentLabel,
  partnerName,
  partnerId,
  record,
  columns,
  sequenceIndex,
  lineItems,
  printSizes = ["a4"],
  fieldKeys,
  totals,
  footerNote,
  signatures,
  termsText,
  contactBand,
}: {
  pageId: string;
  /** The numbering system's document-type id, e.g. "billing.document" — see NUMBERED_DOCUMENT_TYPES. */
  documentType: string;
  documentLabel: string;
  partnerName: string;
  partnerId: string;
  record: Row;
  columns: Column[];
  sequenceIndex: number;
  /** Optional itemized breakdown (currently: Billing invoices) — rendered
   * as its own table instead of the flat field grid when present and no
   * custom template overrides the layout. */
  lineItems?: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[];
  /** Which page sizes this document offers a screen toggle for — e.g. Service Centre's
   * Sales Invoice is A4/A5 only, POS additionally offers Thermal. Defaults to A4 only. */
  printSizes?: PrintSize[];
  /**
   * Curated subset of `columns`, in print order. A record's column set is
   * built for a LIST (every operational/routing/costing field), which is not
   * the same thing as what belongs on a document handed to a customer — a job
   * card showing pickup latitude and internal cost estimates is an internal
   * sheet, not a handover receipt. When omitted every column still prints, so
   * every other module's document is unchanged.
   */
  fieldKeys?: string[];
  /** Overrides the totals read off the record — for documents whose figures
   * are derived rather than stored (e.g. an estimate, priced live from the
   * workorder's current parts/service lines). */
  totals?: { subtotal: number; tax: number; total: number };
  /** Declaration / disclaimer printed under the body, e.g. "not a tax invoice". */
  footerNote?: string;
  /** Signature lines printed at the foot of the document. */
  signatures?: string[];
  /**
   * This partner's configured Terms & Conditions for THIS document type,
   * already resolved (document-specific override -> general fallback) by
   * resolveDocumentTerms(). Null/blank prints no terms block at all — an
   * empty "Terms & Conditions" heading is worse than none.
   */
  termsText?: string | null;
  /**
   * The service centre's own opening hours / public support number, from
   * Settings > Business Profile. Printed as a footer band so a customer
   * holding the paper knows when and where to call. Omitted entirely when
   * the partner hasn't set either.
   */
  contactBand?: { hours?: string | null; hotline?: string | null };
}) {
  const customTemplate = await getDocumentTemplate(pageId);
  const scheme = await getEffectiveScheme(documentType, partnerId);
  const documentNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  const templateRecord = { ...record, documentNumber };

  return (
    <div className="mbf-page bg-bg-sunken">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-8 print:max-w-none print:py-0">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <PrintFrame sizes={printSizes}>
        <div className="rounded-lg border border-border bg-bg-raised p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <span className="font-display text-lg font-extrabold text-text">{partnerName}</span>
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
                {(fieldKeys
                  ? (fieldKeys
                      .map((key) => columns.find((c) => c.key === key))
                      .filter((c): c is Column => Boolean(c)))
                  : columns)
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
                          {formatCurrencyINR(totals ? totals.subtotal : Number(record["subtotal"]) || 0)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex justify-between text-text-muted">
                        <span>Tax</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrencyINR(totals ? totals.tax : Number(record["taxAmount"]) || 0)}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-text">
                        <span>Total</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrencyINR(totals ? totals.total : Number(record["totalAmount"]) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Signature block + declaration — what turns a field dump into a
              document the customer actually signs on handover. Only rendered
              for documents that ask for them, so other modules are unchanged. */}
          {signatures && signatures.length > 0 && (
            <div className="mt-12 flex flex-wrap justify-between gap-8">
              {signatures.map((label) => (
                <div key={label} className="min-w-[180px] flex-1">
                  <div className="h-10 border-b border-border" />
                  <div className="mt-1.5 text-xs text-text-muted">{label}</div>
                </div>
              ))}
            </div>
          )}
          {footerNote && (
            <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">{footerNote}</p>
          )}
          {termsText?.trim() && (
            <div className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
              <div className="font-semibold uppercase tracking-wide">Terms &amp; Conditions</div>
              <p className="mt-1 whitespace-pre-line">{termsText.trim()}</p>
            </div>
          )}
          <DocumentContactBand hours={contactBand?.hours} hotline={contactBand?.hotline} />
        </div>
        </PrintFrame>
      </div>
    </div>
  );
}

/**
 * Shared footer band — the service centre's opening hours and public
 * support number. Exported so the Sales Invoice (which builds its own
 * layout rather than going through DocumentView) prints the identical band.
 */
export function DocumentContactBand({ hours, hotline }: { hours?: string | null; hotline?: string | null }) {
  if (!hours?.trim() && !hotline?.trim()) return null;
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-text-muted">
      {hours?.trim() && <span>Service Hours: {hours.trim()}</span>}
      {hotline?.trim() && <span>Support: {hotline.trim()}</span>}
    </div>
  );
}

function formatFieldValue(column: Column, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (column.type === "currency") return formatCurrencyINR(Number(value));
  if (column.type === "date") return formatDate(String(value));
  return String(value);
}
