import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { renderTemplate } from "@/lib/designer/documentTemplates";
import { DocumentContactBand, DocumentUpiBlock } from "@/components/DocumentView";
import { generateUpiQrDataUrl } from "@/lib/upiQr";
import type { LineItem } from "@/lib/sample-data/billing";

export type BillingInvoiceBankDetails = {
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
};

/** Normalizes "Karnataka" / "karnataka " so a place-of-supply comparison isn't defeated by casing. */
function normalizeState(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Billing's Sales Invoice — the printable document for a "billing"
 * BusinessRecord. Same general shape as
 * service-centre/[recordId]/invoice/ServiceCentreInvoiceDocument.tsx
 * (letterhead + meta box, Bill To / Payment boxes, itemized GST table with
 * the per-line CGST/SGST/IGST split, HSN summary, totals box, bank
 * details, signatures, declaration) — independently built against this
 * repo's own tokens/components, general layout references AN-CRM's
 * invoice per CLAUDE.md's documented UX-pattern exception.
 *
 * Replaces the generic DocumentView fallback (a flat field grid + a flat
 * subtotal/tax/total line-items table) for this one document type, since
 * a real GST tax invoice needs the CGST/SGST/IGST split and HSN summary
 * DocumentView has no awareness of.
 */
export async function BillingInvoiceDocument({
  partnerId,
  partnerName,
  partnerGstin,
  partnerPhone,
  partnerAddress,
  partnerCity,
  partnerState,
  partnerPincode,
  invoiceNumber,
  invoiceDate,
  dueDate,
  paymentMode,
  paymentReference,
  bankDetails,
  customerName,
  customerCompany,
  customerPhone,
  customerEmail,
  customerGstin,
  customerAddress,
  customerCity,
  customerState,
  customerPincode,
  items,
  discountAmount,
  customTemplate,
  notes,
  termsText,
  supportHotline,
  upiId,
  showBankDetails = true,
  showUpiQr = true,
  showTerms = true,
  showNotes = true,
}: {
  partnerId: string;
  partnerName: string;
  /** The issuing partner's own GSTIN/contact — blank renders as an em dash, never a fabricated number. */
  partnerGstin?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerCity?: string;
  /** The place of SUPPLY. Compared against the customer's state to decide CGST+SGST vs IGST. */
  partnerState?: string;
  partnerPincode?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  paymentMode?: string;
  paymentReference?: string;
  /** The issuing partner's own bank account, for a customer paying by transfer. Omitted entirely when unset. */
  bankDetails?: BillingInvoiceBankDetails;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  /** Present => the customer is a GST-registered party, i.e. B2B. */
  customerGstin?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  items: LineItem[];
  discountAmount?: number;
  /** Super-Admin-designed override from the Designer (src/lib/designer/documentTemplates.ts). */
  customTemplate?: string;
  notes?: string;
  termsText?: string | null;
  supportHotline?: string | null;
  /** The partner's own UPI VPA. When set (and the invoice is non-zero) a scannable payment QR is printed. */
  upiId?: string | null;
  /** "On this Invoice" footer toggles from BillingInvoiceForm.tsx — each
   * block below only prints when its toggle is on AND the underlying data
   * actually exists, so a stale "on" from before Settings data was cleared
   * never prints an empty/broken block. Default true (pre-existing
   * invoices saved before this feature existed keep printing everything
   * they always did). */
  showBankDetails?: boolean;
  showUpiQr?: boolean;
  showTerms?: boolean;
  showNotes?: boolean;
}) {
  // Place of supply decides the split: a customer in the partner's own
  // state is an intra-state supply taxed as CGST + SGST at half the slab
  // each; a customer in another state is inter-state and takes the whole
  // slab as IGST. Blank customer state falls back to intra-state — the
  // same default ServiceCentreInvoiceDocument.tsx uses.
  const interState =
    normalizeState(customerState) !== "" &&
    normalizeState(partnerState) !== "" &&
    normalizeState(customerState) !== normalizeState(partnerState);

  const hasTax = items.some((it) => it.taxRate > 0);

  const rows = items.map((it) => {
    const taxable = it.quantity * it.unitPrice;
    const gstAmount = taxable * (it.taxRate / 100);
    return {
      ...it,
      taxable,
      gstAmount,
      cgst: hasTax && !interState ? gstAmount / 2 : 0,
      sgst: hasTax && !interState ? gstAmount / 2 : 0,
      igst: hasTax && interState ? gstAmount : 0,
      total: taxable + gstAmount,
    };
  });
  const subtotal = rows.reduce((s, r) => s + r.taxable, 0);
  const cgstTotal = rows.reduce((s, r) => s + r.cgst, 0);
  const sgstTotal = rows.reduce((s, r) => s + r.sgst, 0);
  const igstTotal = rows.reduce((s, r) => s + r.igst, 0);
  const gstTotal = cgstTotal + sgstTotal + igstTotal;
  const discount = discountAmount ?? 0;
  const grandTotal = subtotal + gstTotal - discount;
  // A GST-registered recipient makes this a B2B document.
  const documentType = customerGstin?.trim() ? "B2B" : "B2C";
  const isPlainBill = documentType === "B2C" && gstTotal === 0;

  const upiQrDataUrl = showUpiQr
    ? await generateUpiQrDataUrl({
        vpa: upiId ?? "",
        payeeName: partnerName,
        amount: grandTotal,
        invoiceNumber,
      })
    : null;

  // One row per HSN code, which is the summary a GST-registered recipient
  // needs to claim input credit. Only meaningful on a B2B document.
  const hsnSummary = Object.values(
    rows.reduce<Record<string, { hsn: string; taxable: number; tax: number }>>((acc, r) => {
      const key = r.hsnCode || "—";
      acc[key] ??= { hsn: key, taxable: 0, tax: 0 };
      acc[key].taxable += r.taxable;
      acc[key].tax += r.gstAmount;
      return acc;
    }, {})
  );

  if (customTemplate) {
    const html = renderTemplate(customTemplate, {
      documentNumber: invoiceNumber,
      invoiceDate,
      customerName,
      customerCompany: customerCompany ?? "",
      customerPhone: customerPhone ?? "",
      customerEmail: customerEmail ?? "",
      customerGstin: customerGstin ?? "",
      customerAddress: customerAddress ?? "",
      customerCity: customerCity ?? "",
      customerState: customerState ?? "",
      customerPincode: customerPincode ?? "",
      documentType,
      subtotal,
      discountAmount: discount,
      cgstTotal,
      sgstTotal,
      igstTotal,
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
            <h1 className="text-center font-display text-xl font-bold tracking-wide text-text">
              {isPlainBill ? "BILL" : "TAX INVOICE"}
            </h1>

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
                <div className="mt-1 text-xs text-text-muted">GSTIN: {partnerGstin || "—"}</div>
                <div className="text-xs text-text-muted">Phone: {partnerPhone || "—"}</div>
              </div>
              <div className="rounded-md border border-border px-4 py-3 text-right text-xs text-text-muted">
                <div>
                  {isPlainBill ? "Bill No" : "Invoice No"}:{" "}
                  <span className="font-mono font-semibold text-text">{invoiceNumber}</span>
                </div>
                <div>
                  {isPlainBill ? "Bill Date" : "Invoice Date"}:{" "}
                  <span className="font-semibold text-text">{formatDate(invoiceDate)}</span>
                </div>
                {dueDate && (
                  <div>
                    Due Date: <span className="font-semibold text-text">{formatDate(dueDate)}</span>
                  </div>
                )}
                <div>
                  Document Type:{" "}
                  <span className="font-semibold text-text">{isPlainBill ? "Bill (No Tax)" : documentType}</span>
                </div>
                {hasTax && (
                  <div>
                    Supply Type:{" "}
                    <span className="font-semibold text-text">{interState ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Bill To</div>
                <div className="mt-1.5 text-sm text-text">
                  <div className="font-semibold">{customerName}</div>
                  {customerCompany && <div className="text-text-muted">{customerCompany}</div>}
                  {customerAddress && <div className="whitespace-pre-line text-text-muted">{customerAddress}</div>}
                  {(customerCity || customerState || customerPincode) && (
                    <div className="text-text-muted">
                      {[customerCity, customerState].filter(Boolean).join(", ")}
                      {customerPincode ? ` — ${customerPincode}` : ""}
                    </div>
                  )}
                  {customerPhone && <div className="text-text-muted">{customerPhone}</div>}
                  {customerEmail && <div className="text-text-muted">{customerEmail}</div>}
                  {customerGstin && <div className="font-mono text-text-muted">GSTIN: {customerGstin}</div>}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Payment</div>
                <div className="mt-1.5 text-sm text-text-muted">
                  <div>
                    Payment Mode: <span className="font-semibold text-text">{paymentMode || "—"}</span>
                  </div>
                  <div>
                    Reference: <span className="font-mono text-text">{paymentReference || "—"}</span>
                  </div>
                  <div>
                    Place of Supply: <span className="font-semibold text-text">{customerState || partnerState || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Item Details</div>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left uppercase tracking-wide text-text-muted">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Description</th>
                    {hasTax && <th className="px-2 py-2">HSN</th>}
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2">Unit</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    <th className="px-2 py-2 text-right">Taxable</th>
                    {hasTax && <th className="px-2 py-2 text-right">GST%</th>}
                    {hasTax && interState && <th className="px-2 py-2 text-right">IGST</th>}
                    {hasTax && !interState && (
                      <>
                        <th className="px-2 py-2 text-right">CGST</th>
                        <th className="px-2 py-2 text-right">SGST</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-2 py-2 text-text-muted">{i + 1}</td>
                      <td className="px-2 py-2 text-text">{r.description}</td>
                      {hasTax && <td className="px-2 py-2 text-text-muted">{r.hsnCode || "—"}</td>}
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.quantity}</td>
                      <td className="px-2 py-2 text-text-muted">{r.unit}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.unitPrice)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.taxable)}</td>
                      {hasTax && <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.taxRate}%</td>}
                      {hasTax && interState && (
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.igst)}</td>
                      )}
                      {hasTax && !interState && (
                        <>
                          <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.cgst)}</td>
                          <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.sgst)}</td>
                        </>
                      )}
                      <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                        {formatCurrencyINR(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-text-muted">Total Items: {rows.length}</p>
            </div>

            {documentType === "B2B" && hasTax && hsnSummary.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">HSN Summary</div>
                <table className="mt-2 w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-left uppercase tracking-wide text-text-muted">
                      <th className="px-2 py-1.5">HSN</th>
                      <th className="px-2 py-1.5 text-right">Taxable</th>
                      <th className="px-2 py-1.5 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsnSummary.map((h) => (
                      <tr key={h.hsn} className="border-b border-border last:border-b-0">
                        <td className="px-2 py-1.5 font-mono text-text">{h.hsn}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-text">{formatCurrencyINR(h.taxable)}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-text">{formatCurrencyINR(h.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs rounded-md border border-border bg-bg-sunken p-4 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Taxable Amount</span>
                  <span className="font-mono tabular-nums">{formatCurrencyINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="mt-1.5 flex justify-between text-text-muted">
                    <span>Discount</span>
                    <span className="font-mono tabular-nums">{formatCurrencyINR(discount)}</span>
                  </div>
                )}
                {hasTax && interState && (
                  <div className="mt-1.5 flex justify-between text-text-muted">
                    <span>IGST</span>
                    <span className="font-mono tabular-nums">{formatCurrencyINR(igstTotal)}</span>
                  </div>
                )}
                {hasTax && !interState && (
                  <>
                    <div className="mt-1.5 flex justify-between text-text-muted">
                      <span>CGST</span>
                      <span className="font-mono tabular-nums">{formatCurrencyINR(cgstTotal)}</span>
                    </div>
                    <div className="mt-1.5 flex justify-between text-text-muted">
                      <span>SGST</span>
                      <span className="font-mono tabular-nums">{formatCurrencyINR(sgstTotal)}</span>
                    </div>
                  </>
                )}
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-text">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums">{formatCurrencyINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {showBankDetails &&
              (bankDetails?.accountName || bankDetails?.bankName || bankDetails?.accountNumber || bankDetails?.ifsc) && (
              <div className="mt-6 rounded-md border border-border p-4 text-xs text-text-muted">
                <div className="font-semibold uppercase tracking-wide">Bank Details</div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1">
                  {bankDetails.accountName && <div>Account Name: <span className="text-text">{bankDetails.accountName}</span></div>}
                  {bankDetails.bankName && <div>Bank: <span className="text-text">{bankDetails.bankName}</span></div>}
                  {bankDetails.accountNumber && <div>Account No: <span className="font-mono text-text">{bankDetails.accountNumber}</span></div>}
                  {bankDetails.ifsc && <div>IFSC: <span className="font-mono text-text">{bankDetails.ifsc}</span></div>}
                </div>
              </div>
            )}

            {upiQrDataUrl && <DocumentUpiBlock qrDataUrl={upiQrDataUrl} />}

            <div className="mt-10 grid grid-cols-2 gap-6 text-center text-xs text-text-muted">
              <div className="border-t border-border pt-2">Customer Signature</div>
              <div className="border-t border-border pt-2">Authorized Signatory ({partnerName})</div>
            </div>

            <div className="mt-8 border-t border-border pt-4 text-xs text-text-muted">
              <div className="font-semibold uppercase tracking-wide">Declaration</div>
              <p className="mt-1">
                Certified that the particulars given above are true and correct. This invoice is generated
                electronically and does not require a physical signature.
              </p>
            </div>

            {showNotes && notes?.trim() && (
              <div className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
                <div className="font-semibold uppercase tracking-wide">Notes</div>
                <p className="mt-1 whitespace-pre-line">{notes.trim()}</p>
              </div>
            )}

            {showTerms && termsText?.trim() && (
              <div className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
                <div className="font-semibold uppercase tracking-wide">Terms &amp; Conditions</div>
                <p className="mt-1 whitespace-pre-line">{termsText.trim()}</p>
              </div>
            )}

            <DocumentContactBand hours={null} hotline={supportHotline} />

            <div className="mt-6 text-center text-xs text-text-muted">
              <div>Thank you for your business with {partnerName}</div>
              <div>{isPlainBill ? "This is a computer generated bill." : "This is a computer generated GST invoice."}</div>
            </div>
          </div>
        </PrintFrame>
      </div>
    </div>
  );
}
