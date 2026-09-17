import QRCode from "qrcode";

/**
 * UPI payment QR generation for printed invoices.
 *
 * Builds the standard `upi://pay?...` deep link every UPI app (GPay,
 * PhonePe, Paytm, BHIM) already understands, and renders it as a PNG data
 * URL that drops straight into an `<img src>` — so the customer can scan
 * the printed/PDF invoice and pay the partner directly.
 *
 * There is deliberately NO gateway, webhook or reconciliation behind this:
 * the money moves from the customer's UPI app to the partner's own VPA
 * without passing through this app, and matching a received payment against
 * an invoice stays a manual step. Nothing here marks anything as paid.
 */
export type UpiQrInput = {
  /** The payee's UPI VPA, e.g. "yourshop@okhdfcbank". */
  vpa: string;
  payeeName: string;
  /** Amount in rupees (this app's money convention). */
  amount: number;
  invoiceNumber: string;
};

/** A VPA is `name@handle` — anything else would produce a QR that fails to scan. */
export function isValidUpiVpa(vpa: string): boolean {
  return /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,64}$/.test(vpa.trim());
}

export function buildUpiLink({ vpa, payeeName, amount, invoiceNumber }: UpiQrInput): string {
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Invoice ${invoiceNumber}`,
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Returns a PNG data URL, or null when there is nothing legitimate to
 * encode (no VPA configured, a malformed one, or a zero-value document) —
 * callers render the QR block only when this is non-null, so a partner who
 * hasn't set a UPI ID gets no broken/empty QR box on their invoice.
 */
export async function generateUpiQrDataUrl(input: UpiQrInput): Promise<string | null> {
  if (!input.vpa?.trim() || !isValidUpiVpa(input.vpa) || !(input.amount > 0)) return null;
  try {
    return await QRCode.toDataURL(buildUpiLink(input), { margin: 1, width: 240 });
  } catch {
    // A QR that can't be generated must not take the whole invoice page
    // down — the document is still valid without it.
    return null;
  }
}
