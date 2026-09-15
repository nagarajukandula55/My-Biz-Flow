import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";
import { LogoMark } from "@/components/LogoMark";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { renderTemplate } from "@/lib/designer/documentTemplates";
import { DocumentContactBand, DocumentUpiBlock } from "@/components/DocumentView";
import { generateUpiQrDataUrl } from "@/lib/upiQr";

export type InvoiceLine = {
  description: string;
  hsn: string;
  quantity: number;
  /** Unit of measure — "Service" for a labour line, the BOM material's own
   * uom for a part line. Printed in the item table's Unit column, same as
   * BillingInvoiceDocument.tsx's LineItem.unit. */
  unit: string;
  rate: number;
  gstRate: number;
  /** Per-line discount in rupees, applied before tax. */
  discount?: number;
};

export type InvoiceBankDetails = {
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
 * Service Centre's Sales Invoice — A4/A5 only (no thermal, unlike POS).
 * Independently built against this repo's own design tokens/components;
 * general shape (letterhead + meta box, Bill To / Payment boxes, itemized
 * GST table with the per-line CGST/SGST/IGST split, HSN summary, totals
 * box, bank details, signatures, declaration) references AN-CRM's invoice
 * layout per CLAUDE.md's documented UX-pattern exception — no code,
 * copy, or visual styling copied.
 */
export async function ServiceCentreInvoiceDocument({
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
  workorderNumber,
  paymentMode,
  paymentReference,
  bankDetails,
  customerName,
  customerPhone,
  customerCompany,
  customerGstin,
  customerAddress,
  customerCity,
  customerState,
  customerPincode,
  lines,
  customTemplate,
  notes,
  termsText,
  serviceHours,
  supportHotline,
  upiId,
  showBankDetails = true,
  showUpiQr = true,
  showTerms = true,
  showNotes = true,
  logoDataUrl,
}: {
  /** Needed (alongside the workorder number) to build the public tracking QR/URL. */
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
  /** The workorder this invoice was raised from — printed so a customer can tie the two documents together. */
  workorderNumber?: string;
  paymentMode?: string;
  paymentReference?: string;
  /** The issuing partner's own bank account, for a customer paying by transfer. Omitted entirely when unset. */
  bankDetails?: InvoiceBankDetails;
  customerName: string;
  customerPhone?: string;
  customerCompany?: string;
  /** Present => the job was billed to a GST-registered party, i.e. B2B. */
  customerGstin?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  lines: InvoiceLine[];
  /** Super-Admin-designed override from the Designer (src/lib/designer/documentTemplates.ts) — same
   * {{placeholder}} mechanism as every other document page; when set, replaces the default layout below. */
  customTemplate?: string;
  /** Free-text handover note carried over from the workorder — prints in
   * the same Notes block BillingInvoiceDocument.tsx has. */
  notes?: string;
  /** Already resolved by resolveDocumentTerms() — invoice-specific text, else the partner's general terms, else null. */
  termsText?: string | null;
  serviceHours?: string | null;
  supportHotline?: string | null;
  /** The partner's own UPI VPA. When set (and the invoice is non-zero) a scannable payment QR is printed. */
  upiId?: string | null;
  /** Per-document footer-block toggles, identical in name, default and
   * meaning to BillingInvoiceDocument.tsx's — the two invoice documents
   * are meant to be interchangeable in everything but where their line
   * items come from, and this one previously had no toggles at all, so a
   * partner could suppress the bank/UPI/terms/notes blocks on a Billing
   * invoice but not on a Service Centre one. Each block still prints only
   * when its toggle is on AND the underlying data actually exists.
   * Default true, so existing workorders print exactly what they did. */
  showBankDetails?: boolean;
  showUpiQr?: boolean;
  showTerms?: boolean;
  showNotes?: boolean;
  /** This partner's own uploaded logo (Settings > Business Details) — see DocumentView.tsx's identical fallback pattern. */
  logoDataUrl?: string | null;
}) {
  // Place of supply decides the split: a customer in the service centre's
  // own state is an intra-state supply taxed as CGST + SGST at half the
  // slab each; a customer in another state is inter-state and takes the
  // whole slab as IGST. Previously this document showed a single flat
  // "GST" line, which is not a valid tax invoice either way. When the
  // customer's state is blank we fall back to intra-state — the common
  // case for a walk-in repair, and the same default the reference app's
  // close-and-invoice step uses.
  const interState =
    normalizeState(customerState) !== "" &&
    normalizeState(partnerState) !== "" &&
    normalizeState(customerState) !== normalizeState(partnerState);

  const rows = lines.map((l) => {
    const discount = l.discount ?? 0;
    const taxable = Math.max(0, l.quantity * l.rate - discount);
    const gstAmount = taxable * (l.gstRate / 100);
    return {
      ...l,
      discount,
      taxable,
      gstAmount,
      cgst: interState ? 0 : gstAmount / 2,
      sgst: interState ? 0 : gstAmount / 2,
      igst: interState ? gstAmount : 0,
      // Rates, not amounts — printed per-line (see the item table below),
      // matching AN-CRM's own item.cgstRate/sgstRate/igstRate convention.
      cgstRate: interState ? 0 : l.gstRate / 2,
      sgstRate: interState ? 0 : l.gstRate / 2,
      igstRate: interState ? l.gstRate : 0,
      total: taxable + gstAmount,
    };
  });
  const taxableTotal = rows.reduce((s, r) => s + r.taxable, 0);
  const discountTotal = rows.reduce((s, r) => s + r.discount, 0);
  const cgstTotal = rows.reduce((s, r) => s + r.cgst, 0);
  const sgstTotal = rows.reduce((s, r) => s + r.sgst, 0);
  const igstTotal = rows.reduce((s, r) => s + r.igst, 0);
  const gstTotal = cgstTotal + sgstTotal + igstTotal;
  const grandTotal = taxableTotal + gstTotal;
  // A GST-registered recipient makes this a B2B document — previously
  // hardcoded "B2C" because no GSTIN was ever collected at intake.
  const documentType = customerGstin?.trim() ? "B2B" : "B2C";
  // Encodes the partner's own VPA and this invoice's exact grand total, so
  // the customer scans and pays the correct amount straight to the partner.
  // Returns null (and the block below is skipped) when no UPI ID is
  // configured, it's malformed, or the document is zero-value — e.g. a
  // fully non-chargeable warranty job, where a "pay now" QR would be wrong.
  const upiQrDataUrl = showUpiQr
    ? await generateUpiQrDataUrl({
        vpa: upiId ?? "",
        payeeName: partnerName,
        amount: grandTotal,
        invoiceNumber,
      })
    : null;
  // Only rendered when at least one line actually carries a discount —
  // buildServiceCentreLines() never sets one today, so an always-₹0.00
  // "Disc" column would be pure noise AND the one column that made this
  // table's shape differ from BillingInvoiceDocument.tsx's. The per-line
  // discount capability itself is kept (InvoiceLine.discount), it just no
  // longer costs a printed column when unused.
  const hasLineDiscount = rows.some((r) => r.discount > 0);
  // A B2C document carrying no tax at all (e.g. an entirely non-chargeable
  // warranty job) is a plain Bill, not a Tax Invoice — calling it one would
  // be a false statement on the document.
  const isPlainBill = documentType === "B2C" && gstTotal === 0;

  // One row per HSN code, which is the summary a GST-registered recipient
  // needs to claim input credit. Only meaningful on a B2B document.
  const hsnSummary = Object.values(
    rows.reduce<Record<string, { hsn: string; taxable: number; tax: number }>>((acc, r) => {
      const key = r.hsn || "—";
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
      customerPhone: customerPhone ?? "",
      customerCompany: customerCompany ?? "",
      customerGstin: customerGstin ?? "",
      customerAddress: customerAddress ?? "",
      customerCity: customerCity ?? "",
      customerState: customerState ?? "",
      customerPincode: customerPincode ?? "",
      documentType,
      workorderNumber: workorderNumber ?? "",
      taxableTotal,
      discountTotal,
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
                <div className="flex items-center gap-2">
                  {logoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a data: URL, not a file next/image can optimise.
                    <img src={logoDataUrl} alt={`${partnerName} logo`} className="h-6 max-w-[6rem] rounded bg-white object-contain p-0.5" />
                  ) : (
                    <LogoMark size={22} />
                  )}
                  <div className="font-display text-base font-bold text-text">{partnerName}</div>
                </div>
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
                {workorderNumber && (
                  <div>
                    Workorder No: <span className="font-mono font-semibold text-text">{workorderNumber}</span>
                  </div>
                )}
                <div>
                  {isPlainBill ? "Bill Date" : "Invoice Date"}:{" "}
                  <span className="font-semibold text-text">{formatDate(invoiceDate)}</span>
                </div>
                <div>
                  Document Type:{" "}
                  <span className="font-semibold text-text">{isPlainBill ? "Bill (No Tax)" : documentType}</span>
                </div>
                <div>
                  Supply Type:{" "}
                  <span className="font-semibold text-text">{interState ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</span>
                </div>
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
                  {customerGstin && (
                    <div className="font-mono text-text-muted">GSTIN: {customerGstin}</div>
                  )}
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
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Product / Service Details</div>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left uppercase tracking-wide text-text-muted">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2">HSN</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2">Unit</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    {hasLineDiscount && <th className="px-2 py-2 text-right">Disc</th>}
                    <th className="px-2 py-2 text-right">Taxable</th>
                    {/* Per line, AN-CRM's own invoice layout shows the tax
                        RATE (%) that applies, not a computed rupee amount —
                        the rupee split is what the totals box below is for.
                        Matched here rather than showing amount columns
                        twice. */}
                    {interState ? (
                      <th className="px-2 py-2 text-right">IGST</th>
                    ) : (
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
                      <td className="px-2 py-2 text-text-muted">{r.hsn || "—"}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.quantity}</td>
                      <td className="px-2 py-2 text-text-muted">{r.unit}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.rate)}</td>
                      {hasLineDiscount && (
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-text-muted">{formatCurrencyINR(r.discount)}</td>
                      )}
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.taxable)}</td>
                      {interState ? (
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.igstRate ? `${r.igstRate}%` : "—"}</td>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.cgstRate ? `${r.cgstRate}%` : "—"}</td>
                          <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{r.sgstRate ? `${r.sgstRate}%` : "—"}</td>
                        </>
                      )}
                      <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text">
                        {formatCurrencyINR(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold text-text">
                    {/* #, Description, HSN, Qty, Unit, Rate (+ Disc when shown) */}
                    <td className="px-2 py-2" colSpan={hasLineDiscount ? 7 : 6}>
                      Total
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">{formatCurrencyINR(taxableTotal)}</td>
                    {interState ? (
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{formatCurrencyINR(igstTotal)}</td>
                    ) : (
                      <>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">{formatCurrencyINR(cgstTotal)}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">{formatCurrencyINR(sgstTotal)}</td>
                      </>
                    )}
                    <td className="px-2 py-2 text-right font-mono tabular-nums">{formatCurrencyINR(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-1 text-xs text-text-muted">Total Items: {rows.length}</p>
            </div>

            {/* A GST-registered recipient needs the per-HSN breakup to claim
                input credit; a B2C walk-in has no use for it. */}
            {documentType === "B2B" && hsnSummary.length > 0 && (
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
                  <span className="font-mono tabular-nums">{formatCurrencyINR(taxableTotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="mt-1.5 flex justify-between text-text-muted">
                    <span>Discount</span>
                    <span className="font-mono tabular-nums">{formatCurrencyINR(discountTotal)}</span>
                  </div>
                )}
                {/* Only the split that actually applies is printed — showing
                    a zeroed IGST row on every intra-state invoice (and vice
                    versa) conveys nothing and reads as an error. */}
                {interState ? (
                  <div className="mt-1.5 flex justify-between text-text-muted">
                    <span>IGST</span>
                    <span className="font-mono tabular-nums">{formatCurrencyINR(igstTotal)}</span>
                  </div>
                ) : (
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

            {/* Rendered only when the partner has actually saved bank
                details on their profile — never a placeholder account. */}
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

            {/* The shared DocumentUpiBlock, same as
                BillingInvoiceDocument.tsx and every DocumentView-based
                print. This used to be a hand-inlined copy with its own
                markup and wording, so the two invoice documents printed
                visibly different UPI blocks for the same partner and the
                same QR generator. */}
            {upiQrDataUrl && <DocumentUpiBlock qrDataUrl={upiQrDataUrl} />}

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

            {/* Notes then Terms, same order and markup as
                BillingInvoiceDocument.tsx — this document previously had
                no Notes block at all, so a handover note recorded against
                the workorder never reached the printed invoice. */}
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

            <DocumentContactBand hours={serviceHours} hotline={supportHotline} />

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
