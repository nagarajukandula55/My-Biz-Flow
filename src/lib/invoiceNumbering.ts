/**
 * One numbering policy for every sales invoice, independent of where it was
 * raised (Billing, POS, Service Centre, recurring billing, or another
 * module). Customer GSTIN determines B2B/B2C details, not the serial.
 */
export type InvoiceDocumentType = "GST" | "Non-GST";

export function resolveInvoiceDocumentType(value: unknown, issuerHasGstin: boolean): InvoiceDocumentType {
  // An explicitly selected Non-GST document always remains Non-GST. A GST
  // document can only be issued by a GST-registered business; integrations
  // that omit the field use the issuer's registration as the safe default.
  if (String(value ?? "").trim() === "Non-GST") return "Non-GST";
  return issuerHasGstin ? "GST" : "Non-GST";
}

export function invoiceNumberingConfig(invoiceType: InvoiceDocumentType): {
  documentType: "invoice.gst" | "invoice.non-gst";
  defaults: { prefix: string };
} {
  return invoiceType === "GST"
    ? { documentType: "invoice.gst", defaults: { prefix: "GST" } }
    : { documentType: "invoice.non-gst", defaults: { prefix: "NONGST" } };
}
