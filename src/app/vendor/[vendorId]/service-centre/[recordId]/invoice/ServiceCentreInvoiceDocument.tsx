import { LogoMark } from "@/components/LogoMark";
import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { renderTemplate } from "@/lib/designer/documentTemplates";

export type InvoiceLine = {
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstRate: number;
};

/**
 * Service Centre's Sales Invoice — A4/A5 only (no thermal, unlike POS).
 * Independently built against this repo's own design tokens/components;
 * general shape (letterhead + meta box, Bill To, itemized GST table,
 * totals box, signatures, declaration) references AN-CRM's invoice
 * layout per CLAUDE.md's documented UX-pattern exception — no code,
 * copy, or visual styling copied.
 */
export function ServiceCentreInvoiceDocument({
  vendorName,
  invoiceNumber,
  invoiceDate,
  customerName,
  customerPhone,
  customerCity,
  customerState,
  lines,
  customTemplate,
}: {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone?: string;
  customerCity?: string;
  customerState?: string;
  lines: InvoiceLine[];
  /** Super-Admin-designed override from the Designer (src/lib/designer/documentTemplates.ts) — same
   * {{placeholder}} mechanism as every other document page; when set, replaces the default layout below. */
  customTemplate?: string;
}) {
  const rows = lines.map((l) => {
    const taxable = l.quantity * l.rate;
    const gstAmount = taxable * (l.gstRate / 100);
    return { ...l, taxable, gstAmount, total: taxable + gstAmount };
  });
  const taxableTotal = rows.reduce((s, r) => s + r.taxable, 0);
  const gstTotal = rows.reduce((s, r) => s + r.gstAmount, 0);
  const grandTotal = taxableTotal + gstTotal;

  if (customTemplate) {
    const html = renderTemplate(customTemplate, {
      documentNumber: invoiceNumber,
      invoiceDate,
      customerName,
      customerPhone: customerPhone ?? "",
      customerCity: customerCity ?? "",
      customerState: customerState ?? "",
      taxableTotal,
      taxAmount: gstTotal,
      totalAmount: grandTotal,
    });
    return (
      <div className="mbf-page bg-bg-sunken">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 py-8 print:max-w-none print:py-0">
          <div className="flex justify-end print:hidden">
            <PrintButton />
          </div>
          <PrintFrame sizes={["a4", "a5"]}>
            <div
              className="rounded-lg border border-border bg-bg-raised p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </PrintFrame>
        </div>
      </div>
    );
  }

  return (
    <div className="mbf-page bg-bg-sunken">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-8 print:max-w-none print:py-0">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <PrintFrame sizes={["a4", "a5"]}>
          <div className="rounded-lg border border-border bg-bg-raised p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <h1 className="text-center font-display text-xl font-bold tracking-wide text-text">TAX INVOICE</h1>

            <div className="mt-6 flex items-start justify-between gap-6">
              <div className="rounded-md bg-bg-sunken px-4 py-3">
                <div className="font-display text-base font-bold text-text">{vendorName}</div>
                <div className="mt-1 text-xs text-text-muted">GSTIN: —</div>
                <div className="text-xs text-text-muted">Phone: —</div>
              </div>
              <div className="rounded-md border border-border px-4 py-3 text-right text-xs text-text-muted">
                <div>
                  Invoice No: <span className="font-mono font-semibold text-text">{invoiceNumber}</span>
                </div>
                <div>
                  Invoice Date: <span className="font-semibold text-text">{formatDate(invoiceDate)}</span>
                </div>
                <div>
                  Document Type: <span className="font-semibold text-text">B2C</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Bill To</div>
              <div className="mt-1.5 text-sm text-text">
                <div className="font-semibold">{customerName}</div>
                {customerPhone && <div className="text-text-muted">{customerPhone}</div>}
                {(customerCity || customerState) && (
                  <div className="text-text-muted">
                    {customerCity}
                    {customerCity && customerState ? ", " : ""}
                    {customerState}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Product / Service Details</div>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left uppercase tracking-wide text-text-muted">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2">HSN</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    <th className="px-2 py-2 text-right">Taxable</th>
                    <th className="px-2 py-2 text-right">GST%</th>
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-2 py-2 text-text-muted">{i + 1}</td>
                      <td className="px-2 py-2 text-text">{r.description}</td>
                      <td className="px-2 py-2 text-text-muted">{r.hsn || "—"}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.quantity}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.rate)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.taxable)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.gstRate}%</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                        {formatCurrencyINR(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-text-muted">Total Items: {rows.length}</p>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs rounded-md border border-border bg-bg-sunken p-4 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Taxable Amount</span>
                  <span className="font-mono tabular-nums">{formatCurrencyINR(taxableTotal)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-text-muted">
                  <span>GST</span>
                  <span className="font-mono tabular-nums">{formatCurrencyINR(gstTotal)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-text">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums">{formatCurrencyINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6 text-center text-xs text-text-muted">
              <div className="border-t border-border pt-2">Customer Signature</div>
              <div className="border-t border-border pt-2">Authorized Signatory (Service Centre)</div>
            </div>

            <div className="mt-8 border-t border-border pt-4 text-xs text-text-muted">
              <div className="font-semibold uppercase tracking-wide">Declaration</div>
              <p className="mt-1">
                Certified that the particulars given above are true and correct. This invoice is generated
                electronically and does not require a physical signature.
              </p>
            </div>
          </div>
        </PrintFrame>
      </div>
    </div>
  );
}
