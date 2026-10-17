export type InvoiceAmounts = { subtotal: number; tax: number; discount: number; roundOff: number; total: number };
function money(value: unknown, optional = false) {
  if (optional && (value === undefined || value === null || value === "")) return 0;
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") throw new Error("Invoice amounts are missing or invalid.");
  const number = Number(value), paise = Math.round(number * 100);
  if (!Number.isFinite(number) || !Number.isSafeInteger(paise) || Math.abs(paise) > 2147483647 || Math.abs(number * 100 - paise) > 0.00001) throw new Error("Invoice amounts must be valid amounts with at most two decimal places.");
  return paise;
}
export function invoiceAmounts(data: Record<string, unknown>): InvoiceAmounts {
  const amounts = { subtotal: money(data.subtotal), tax: money(data.taxAmount), discount: money(data.discountAmount, true), roundOff: money(data.roundOff, true), total: money(data.totalAmount) };
  if (amounts.subtotal < 0 || amounts.tax < 0 || amounts.discount < 0 || amounts.discount > amounts.subtotal || amounts.total <= 0 || amounts.subtotal + amounts.tax - amounts.discount + amounts.roundOff !== amounts.total) throw new Error("Invoice subtotal, tax, discount and rounding do not reconcile to its positive total.");
  if (["Draft", "Cancelled", "Void"].includes(String(data.paymentStatus ?? data.status))) throw new Error("Draft or cancelled invoices cannot be reconciled as sales.");
  return amounts;
}
export type ReconciliationLine = { accountId?: string; debit: number; credit: number; account: { partnerId: string; accountType: string } };
export function reconcileInvoiceDate(data: Record<string, unknown>, entryDate: Date) {
  const date = String(data.issueDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return "Invoice issue date is missing or invalid.";
  return entryDate.toISOString().slice(0, 10) === date ? null : "Journal date differs from the invoice issue date.";
}
/** Checks posted amounts only; does not certify tax rates, filing eligibility or payment collection. */
export function reconcileInvoiceLines(partnerId: string, amounts: InvoiceAmounts, lines: ReconciliationLine[]) {
  if (lines.some(line => line.account.partnerId !== partnerId || !Number.isSafeInteger(line.debit) || !Number.isSafeInteger(line.credit) || line.debit < 0 || line.credit < 0)) return "Journal has invalid or foreign account lines.";
  const debit = lines.reduce((sum, line) => sum + line.debit, 0), credit = lines.reduce((sum, line) => sum + line.credit, 0);
  if (debit !== amounts.total || credit !== amounts.total) return "Journal debit/credit totals differ from the invoice total.";
  const net = (type: string) => lines.filter(line => line.account.accountType === type).reduce((sum, line) => sum + line.credit - line.debit, 0);
  if (net("Income") !== amounts.total - amounts.tax || net("Liability") !== amounts.tax || net("Asset") !== -amounts.total || net("Expense") !== 0 || net("Equity") !== 0) return "Revenue, tax liability or receivable allocation differs from the invoice.";
  return null;
}

export type BillingDocumentKind = "billing" | "billing-credit-notes" | "billing-payments";
export function billingDocumentKind(value: string): BillingDocumentKind {
  if (!["billing", "billing-credit-notes", "billing-payments"].includes(value)) throw new Error("Choose a supported Billing document type.");
  return value as BillingDocumentKind;
}
export function documentAmounts(kind: BillingDocumentKind, data: Record<string, unknown>): InvoiceAmounts {
  if (kind !== "billing-payments") {
    if (kind === "billing-credit-notes" && !["Credit Note", "Debit Note"].includes(String(data.noteType))) throw new Error("Select a valid credit or debit note type.");
    return invoiceAmounts(data);
  }
  const total = money(data.amount);
  if (total <= 0 || ["Draft", "Cancelled", "Void"].includes(String(data.status))) throw new Error("Only positive recorded payments can be reconciled.");
  return { subtotal: total, tax: 0, discount: 0, roundOff: 0, total };
}
export function reconcileDocument(partnerId: string, kind: BillingDocumentKind, data: Record<string, unknown>, entryDate: Date, lines: ReconciliationLine[]) {
  const amounts = documentAmounts(kind, data);
  const dateIssue = reconcileInvoiceDate(kind === "billing-payments" ? { issueDate: data.date } : data, entryDate);
  if (dateIssue) return dateIssue.replace(/Invoice|invoice/g, "Document");
  if (kind !== "billing-payments") return reconcileInvoiceLines(partnerId, amounts, kind === "billing-credit-notes" && data.noteType === "Credit Note" ? lines.map(line => ({ ...line, debit: line.credit, credit: line.debit })) : lines);
  if (lines.length < 2 || lines.some(line => line.account.partnerId !== partnerId || line.account.accountType !== "Asset" || !line.accountId || !Number.isSafeInteger(line.debit) || !Number.isSafeInteger(line.credit) || line.debit < 0 || line.credit < 0 || (line.debit > 0) === (line.credit > 0))) return "Payment posting must use valid business asset accounts, with separate receipt and receivable lines.";
  const debits = new Set(lines.filter(line => line.debit > 0).map(line => line.accountId));
  if (lines.some(line => line.credit > 0 && debits.has(line.accountId))) return "Receipt and receivable must use distinct asset accounts.";
  if (lines.reduce((sum,line)=>sum+line.debit,0) !== amounts.total || lines.reduce((sum,line)=>sum+line.credit,0) !== amounts.total) return "Journal debit/credit totals differ from the payment amount.";
  return null;
}
