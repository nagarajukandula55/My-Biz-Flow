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
            <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
              {columns
                .filter((c) => c.key !== "id")
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
