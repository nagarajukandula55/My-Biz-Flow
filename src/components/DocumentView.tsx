import type { Column, Row } from "@/components/DataTable";
import { LogoMark } from "@/components/LogoMark";
import { PrintButton } from "@/components/PrintButton";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { getDocumentTemplate, renderTemplate } from "@/lib/designer/documentTemplates";

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
 */
export function DocumentView({
  pageId,
  documentLabel,
  vendorName,
  record,
  columns,
}: {
  pageId: string;
  documentLabel: string;
  vendorName: string;
  record: Row;
  columns: Column[];
}) {
  const customTemplate = getDocumentTemplate(pageId);

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
              <div className="mt-0.5 font-mono text-xs text-text-muted">
                {String(record["id"] ?? "")}
              </div>
            </div>
          </div>

          {customTemplate ? (
            <div
              className="mt-6"
              // Template is Super-Admin-authored and every substituted
              // value is HTML-escaped by renderTemplate() — see that
              // function's docs for why this is safe.
              dangerouslySetInnerHTML={{ __html: renderTemplate(customTemplate, record) }}
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
