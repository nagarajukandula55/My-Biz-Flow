import { createBusinessRecord, getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import type { SaleLine } from "@/lib/sample-data/pos";
import type { LineItem } from "@/lib/sample-data/billing";
import { getNextNumber } from "@/lib/designer/numbering";

const round = (amount: number) => Math.round(amount * 100) / 100;

export function calculatePosCredit(lines: { line: SaleLine; qty: number }[]) {
  const items: LineItem[] = lines.map(({ line, qty }) => {
    const discount = line.discount ?? 0;
    const taxRate = line.taxRate ?? 0;
    if (!Number.isSafeInteger(line.qty) || line.qty <= 0 || !Number.isSafeInteger(qty) || qty <= 0 || qty > line.qty || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || !Number.isFinite(discount) || discount < 0 || discount > line.qty * line.unitPrice || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new Error("Invalid stored sale line for credit note.");
    }
    return { description: line.productName, quantity: qty, unit: "pcs", unitPrice: line.unitPrice - discount / line.qty, taxRate };
  });
  const subtotal = round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const taxAmount = round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice * item.taxRate / 100, 0));
  return { items, subtotal, taxAmount, totalAmount: round(subtotal + taxAmount) };
}

/** Must run under the same partner inventory lock and database transaction as stock restoration. */
export async function recordPosBillingReversal(input: {
  partnerId: string;
  saleId: string;
  invoiceId: string;
  lines: { line: SaleLine; qty: number }[];
  refundMethod: string;
  refundReference: string;
  reason: string;
  returnId?: string;
}) {
  const invoice = await getBusinessRecord(input.partnerId, "billing", input.invoiceId);
  if (!invoice || invoice["sourcePosSaleId"] !== input.saleId || invoice["paymentStatus"] !== "Paid") {
    throw new Error("The paid POS invoice is missing or does not match this sale. Review before restoring stock.");
  }
  if (invoice["posCreditNoteId"]) throw new Error("This invoice has already been reversed.");
  const existingNotes = await listBusinessRecords(input.partnerId, "billing-credit-notes");
  if (existingNotes.some((note) => note["linkedInvoiceId"] === input.invoiceId && note["noteType"] === "Credit Note")) {
    throw new Error("A credit note already references this invoice; review it before returning stock.");
  }
  const { items, subtotal, taxAmount, totalAmount } = calculatePosCredit(input.lines);
  const paid = Number(invoice["amountPaid"] ?? invoice["totalAmount"]);
  if (!items.length || totalAmount <= 0 || !Number.isFinite(paid) || totalAmount > paid + 0.001) {
    throw new Error("The credit note exceeds the paid POS invoice.");
  }
  const note = await createBusinessRecord(input.partnerId, "billing-credit-notes", {
    noteNumber: await getNextNumber("billing.credit-note", input.partnerId, { prefix: "CN", sequenceDigits: 4, financialYearFormat: "none" }),
    noteType: "Credit Note",
    contact: invoice["customer"] ?? "Walk-in Customer",
    linkedInvoiceId: input.invoiceId,
    linkedInvoiceNumber: String(invoice["invoiceNumber"] ?? input.invoiceId),
    linkedInvoiceDate: String(invoice["issueDate"] ?? ""),
    reason: "Sales Return",
    issueDate: new Date().toISOString().slice(0, 10),
    items,
    lineItemsSummary: items.map((item) => `${item.description} x${item.quantity}`).join(", "),
    subtotal,
    taxAmount,
    totalAmount,
    sourcePosSaleId: input.saleId,
    sourcePosReturnId: input.returnId ?? "",
    refundMethod: input.refundMethod,
    refundReference: input.refundReference,
    refundReason: input.reason,
  });
  await updateBusinessRecord(input.partnerId, "billing", input.invoiceId, {
    ...invoice,
    posCreditNoteId: note.id,
    amountRefunded: totalAmount,
  });
  return { noteId: String(note.id), totalAmount };
}
