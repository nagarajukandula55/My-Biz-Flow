"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { renderTemplate } from "@/lib/designer/documentTemplates";

export type InvoiceLine = {
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  discount?: number;
};

/** Normalizes "Karnataka" / "karnataka " so a place-of-supply comparison isn't defeated by casing. */
function normalizeState(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

const safe = (v: string | number | undefined | null) => (v === undefined || v === null || v === "" ? "—" : String(v));
const money = (n?: number) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Service Centre's Sales Invoice — an exact port of AN-CRM's own
 * RichInvoiceLayout.tsx (letterhead + meta box, Bill To / Device-or-Payment
 * boxes, itemized GST table with per-line CGST/SGST/IGST, HSN chip summary,
 * UPI payment QR beside the totals box, signatures, declaration), per
 * explicit direction that this document should match AN-CRM's layout —
 * reproduces its `ric-*` styles verbatim rather than reinterpreting them
 * with this app's own design tokens.
 */
export function ServiceCentreInvoiceDocument({
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
  status,
  paymentMode,
  customerName,
  customerPhone,
  customerGstin,
  customerAddress,
  customerCity,
  customerState,
  customerPincode,
  brand,
  model,
  imeiOrSerial,
  lines,
  customTemplate,
  notes,
  termsText,
  upiId,
  logoDataUrl,
}: {
  partnerName: string;
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
  status?: string;
  paymentMode?: string;
  customerName: string;
  customerPhone?: string;
  /** Present => the job was billed to a GST-registered party, i.e. B2B. */
  customerGstin?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  brand?: string;
  model?: string;
  imeiOrSerial?: string;
  lines: InvoiceLine[];
  /** Super-Admin-designed override from the Designer — same {{placeholder}} mechanism as every other document page. */
  customTemplate?: string;
  notes?: string;
  /** Already resolved by resolveDocumentTerms() — invoice-specific text, else the partner's general terms, else null. */
  termsText?: string | null;
  /** The partner's own UPI VPA. When set (and the invoice is non-zero) a scannable payment QR is printed, same as AN-CRM's own "QR only if UPI ID set" rule. */
  upiId?: string | null;
  logoDataUrl?: string | null;
}) {
  const [qr, setQr] = useState("");
  const accent = "#111827";

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
      taxable,
      cgstRate: interState ? 0 : l.gstRate / 2,
      sgstRate: interState ? 0 : l.gstRate / 2,
      igstRate: interState ? l.gstRate : 0,
      cgst: interState ? 0 : gstAmount / 2,
      sgst: interState ? 0 : gstAmount / 2,
      igst: interState ? gstAmount : 0,
      total: taxable + gstAmount,
    };
  });
  const taxableTotal = rows.reduce((s, r) => s + r.taxable, 0);
  const discountTotal = rows.reduce((s, r) => s + (r.discount ?? 0), 0);
  const cgstTotal = rows.reduce((s, r) => s + r.cgst, 0);
  const sgstTotal = rows.reduce((s, r) => s + r.sgst, 0);
  const igstTotal = rows.reduce((s, r) => s + r.igst, 0);
  const gstTotal = cgstTotal + sgstTotal + igstTotal;
  const grandTotal = taxableTotal + gstTotal;
  const hasGstSplit = !!(cgstTotal || sgstTotal || igstTotal);

  const isB2B = !!customerGstin?.trim();
  const isPlainBill = !isB2B && !hasGstSplit;
  const isPayableDoc = true; // Sales Invoice / Bill is always a payable document, unlike Estimate/Workorder/Service Record.
  const showPaymentQr = isPayableDoc && !!upiId?.trim();

  useEffect(() => {
    if (typeof window === "undefined" || !showPaymentQr) return;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId!)}&pn=${encodeURIComponent(partnerName || "")}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoiceNumber)}`;
    QRCode.toDataURL(upiUrl).then(setQr).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentQr, upiId, partnerName, grandTotal, invoiceNumber]);

  const hsnSummary = Object.values(
    rows.reduce<Record<string, { hsn: string; taxable: number }>>((acc, r) => {
      const key = r.hsn || "—";
      acc[key] ??= { hsn: key, taxable: 0 };
      acc[key].taxable += r.taxable;
      return acc;
    }, {})
  );

  const companyAddress = [partnerAddress, [partnerCity, partnerState].filter(Boolean).join(", "), partnerPincode].filter(Boolean).join(" — ");
  const customerFullAddress = [customerAddress, [customerCity, customerState].filter(Boolean).join(", "), customerPincode].filter(Boolean).join(" — ");
  const hasDevice = !!(brand || model || imeiOrSerial);

  if (customTemplate) {
    const html = renderTemplate(customTemplate, {
      documentNumber: invoiceNumber,
      invoiceDate,
      customerName,
      customerPhone: customerPhone ?? "",
      customerGstin: customerGstin ?? "",
      customerAddress: customerFullAddress,
      documentType: isB2B ? "B2B" : "B2C",
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
      <div className="ric-page">
        <style>{RIC_STYLES}</style>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <div className="ric-page">
      <style>{RIC_STYLES}</style>

      <div className="ric-invoiceTitle" style={{ color: accent }}>
        {isPlainBill ? "BILL" : "TAX INVOICE"}
      </div>

      <div className="ric-header">
        <div className="ric-companyCard">
          <div className="ric-companyName">
            {logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDataUrl} alt="" style={{ height: 24, marginRight: 8, verticalAlign: "middle", objectFit: "contain" }} />
            )}
            {safe(partnerName)}
          </div>
          <div>{safe(companyAddress)}</div>
          {partnerGstin && <div>GSTIN: {partnerGstin}</div>}
          {partnerPhone && <div>Phone: {partnerPhone}</div>}
        </div>

        <div className="ric-invoiceBox">
          <div><b>{isPlainBill ? "Bill No:" : "Invoice No:"}</b> {safe(invoiceNumber)}</div>
          {workorderNumber && <div><b>WO:</b> {workorderNumber}</div>}
          <div><b>Date:</b> {safe(invoiceDate)}</div>
          {status && <div><b>Status:</b> {safe(status)}</div>}
          <div><b>Document Type:</b> {isPlainBill ? "Bill (No Tax)" : isB2B ? "B2B" : "B2C"}</div>
        </div>
      </div>

      <div className="ric-grid2">
        <div className="ric-box">
          <div className="ric-sectionTitle">BILL TO</div>
          <div>{safe(customerName)}</div>
          <div>{safe(customerPhone)}</div>
          <div>{safe(customerFullAddress)}</div>
          {isB2B && <div>GSTIN: {safe(customerGstin)}</div>}
        </div>
        {hasDevice ? (
          <div className="ric-box">
            <div className="ric-sectionTitle">DEVICE</div>
            <div>{[brand, model].filter(Boolean).join(" ") || "—"}</div>
            <div>IMEI/Serial: {safe(imeiOrSerial)}</div>
          </div>
        ) : (
          <div className="ric-box">
            <div className="ric-sectionTitle">PAYMENT</div>
            <div>Status: {safe(status)}</div>
            {paymentMode && <div>Mode: {safe(paymentMode)}</div>}
          </div>
        )}
      </div>

      <div className="ric-productHeader">PRODUCT / SERVICE DETAILS</div>

      <table className="ric-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>HSN</th>
            <th>Qty</th>
            <th>Rate</th>
            {hasGstSplit ? (
              <>
                <th>CGST</th>
                <th>SGST</th>
                <th>IGST</th>
              </>
            ) : (
              <th>Tax%</th>
            )}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className="ric-descCell">{r.description}</td>
              <td>{safe(r.hsn)}</td>
              <td>{r.quantity} {r.unit || ""}</td>
              <td>{money(r.rate)}</td>
              {hasGstSplit ? (
                <>
                  <td>{r.cgstRate ? `${r.cgstRate}%` : "—"}</td>
                  <td>{r.sgstRate ? `${r.sgstRate}%` : "—"}</td>
                  <td>{r.igstRate ? `${r.igstRate}%` : "—"}</td>
                </>
              ) : (
                <td>{r.gstRate}%</td>
              )}
              <td>{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isB2B && hsnSummary.length > 0 && (
        <div className="ric-hsnSummary">
          {hsnSummary.map((row) => (
            <span key={row.hsn} className="ric-hsnChip">HSN {row.hsn} — {money(row.taxable)}</span>
          ))}
        </div>
      )}

      <div className="ric-summaryRow">
        {showPaymentQr ? (
          <div className="ric-qrBlock">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Payment QR" width={110} height={110} />
            )}
            <p className="ric-qrCaption">Scan to pay via UPI</p>
          </div>
        ) : (
          <div />
        )}

        <div className="ric-summary">
          <div><span>Subtotal</span><span>{money(taxableTotal)}</span></div>
          {hasGstSplit ? (
            <>
              {!!cgstTotal && <div><span>CGST</span><span>{money(cgstTotal)}</span></div>}
              {!!sgstTotal && <div><span>SGST</span><span>{money(sgstTotal)}</span></div>}
              {!!igstTotal && <div><span>IGST</span><span>{money(igstTotal)}</span></div>}
            </>
          ) : (
            <div><span>Tax</span><span>{money(gstTotal)}</span></div>
          )}
          {!!discountTotal && <div><span>Discount</span><span>-{money(discountTotal)}</span></div>}
          <div className="ric-grand"><span>Grand Total</span><span>{money(grandTotal)}</span></div>
        </div>
      </div>

      {notes?.trim() && (
        <div className="ric-box" style={{ marginTop: 12 }}>
          <p className="ric-sectionTitle">Notes</p>
          <p style={{ whiteSpace: "pre-line" }}>{notes.trim()}</p>
        </div>
      )}

      {termsText?.trim() && (
        <div className="ric-box" style={{ marginTop: 12 }}>
          <p className="ric-sectionTitle">Terms &amp; Conditions</p>
          <p style={{ whiteSpace: "pre-line" }}>{termsText.trim()}</p>
        </div>
      )}

      <div className="ric-signatureRow">
        <div className="ric-signatureBox">
          <div className="ric-signatureLine" />
          <div className="ric-signatoryText">Customer Signature</div>
        </div>
        <div className="ric-signatureBox">
          <div className="ric-digitalNotice">Digital document — no physical signature required.</div>
          <div className="ric-signatoryText">Authorized Signatory</div>
        </div>
      </div>

      <div className="ric-footer">
        {isPlainBill ? "This is a computer-generated bill." : "This is a computer-generated document."}
      </div>

      <div className="ric-declaration">
        <b>Declaration</b>
        <p>Certified that the particulars given above are true and correct. This document is generated electronically and does not require a physical signature.</p>
      </div>

      <button onClick={() => window.print()} className="ric-printBtn print:hidden">
        Print / Save as PDF
      </button>
    </div>
  );
}

const RIC_STYLES = `
.ric-page { max-width: 900px; margin: 0 auto; padding: 4px; font-family: Arial, sans-serif; color: #111827; font-size: 11px; }
.ric-invoiceTitle { text-align: center; font-size: 22px; font-weight: 800; margin-bottom: 12px; letter-spacing: 1px; }
.ric-header { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #111827; padding-bottom: 10px; }
.ric-companyCard { background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; line-height: 1.5; max-width: 320px; }
.ric-companyName { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.ric-invoiceBox { border: 1px solid #111827; border-radius: 8px; padding: 10px; min-width: 240px; line-height: 1.6; font-size: 12px; }
.ric-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
.ric-box { padding: 8px 10px; font-size: 11px; line-height: 1.5; background: #fafafa; border-radius: 8px; }
.ric-sectionTitle { font-size: 11px; font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
.ric-productHeader { margin-top: 8px; padding-top: 6px; border-top: 1px solid #111827; font-size: 13px; font-weight: 700; text-decoration: underline; margin-bottom: 6px; }
.ric-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.ric-table th { background: #111827; color: #fff; padding: 6px; border: 1px solid #111827; }
.ric-table td { border: 1px solid #d1d5db; padding: 5px; text-align: center; }
.ric-descCell { text-align: left !important; padding-left: 8px !important; }
.ric-hsnSummary { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; }
.ric-hsnChip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 8px; }
.ric-summaryRow { display: flex; justify-content: space-between; gap: 16px; margin-top: 16px; align-items: flex-start; }
.ric-qrBlock { text-align: center; }
.ric-qrCaption { font-size: 9px; color: #6b7280; margin-top: 4px; }
.ric-summary { width: 260px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
.ric-summary > div { display: flex; justify-content: space-between; padding: 2px 0; }
.ric-grand { font-size: 14px; font-weight: 800; border-top: 1px solid #111827; margin-top: 6px; padding-top: 6px !important; }
.ric-signatureRow { display: flex; justify-content: space-between; gap: 20px; margin-top: 26px; }
.ric-signatureBox { width: 45%; text-align: center; }
.ric-signatureLine { height: 55px; border-bottom: 1px solid #111827; }
.ric-digitalNotice { height: 55px; display: flex; align-items: flex-end; justify-content: center; font-size: 10px; color: #555; font-style: italic; padding-bottom: 4px; }
.ric-signatoryText { margin-top: 4px; border-top: 1px solid #111827; padding-top: 3px; font-size: 11px; font-weight: 600; }
.ric-footer { text-align: center; margin-top: 16px; font-size: 11px; }
.ric-declaration { margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #4b5563; }
.ric-printBtn { margin-top: 20px; padding: 10px 20px; background: #111827; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
@media print {
  .ric-table th { background: #111827 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
