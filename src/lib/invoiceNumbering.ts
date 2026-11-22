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
    // Preserve the established document naming defaults. Counters remain
    // separate by GST status; only the prefix follows the familiar invoice
    // names unless the partner overrides it in Document Numbering settings.
    ? { documentType: "invoice.gst", defaults: { prefix: "INV" } }
    : { documentType: "invoice.non-gst", defaults: { prefix: "BILL" } };
}
