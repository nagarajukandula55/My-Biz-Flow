import { prisma } from "@/lib/prisma";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { withRecordLock } from "@/lib/withRecordLock";
import { billingDocumentKind, documentAmounts, reconcileDocument } from "@/lib/billingReconciliationRules";
import { createJournalEntry } from "@/lib/accounting";

async function access(partnerId: string) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "accounting");
  await assertModuleAccess(partnerId, "billing");
}
const lines = { include: { account: { select: { partnerId: true, accountType: true } } } } as const;
export async function billingReconciliation(partnerId: string, after = "", documentKind = "billing") {
  await access(partnerId);
  const kind = billingDocumentKind(documentKind);
  if (after.length > 200) throw new Error("Invalid page cursor.");
  const invoices = await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: kind, ...(after ? { recordKey: { gt: after } } : {}) }, orderBy: { recordKey: "asc" }, take: 51 });
  const page = invoices.slice(0, 50);
  const journals = page.length ? await prisma.journalEntry.findMany({ where: { partnerId, sourceType: kind, sourceRecordId: { in: page.map(invoice => invoice.recordKey) } }, include: { lines }, take: 501 }) : [];
  const parentKey = kind === "billing-payments" ? "invoiceId" : "linkedInvoiceId";
  const parentIds = kind === "billing" ? [] : [...new Set(page.map(row => String((row.data as Record<string, unknown>)[parentKey] ?? "")))];
  const parents = parentIds.length ? await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: "billing", recordKey: { in: parentIds } }, select: { recordKey: true }, take: 50 }) : [];
  const ownParents = new Set(parents.map(row => row.recordKey));
  if (journals.length > 500) throw new Error("Too many linked journal entries. Review duplicate source links before reconciling.");
  const reversals = journals.length ? await prisma.journalEntry.findMany({ where: { partnerId, sourceType: "journal-reversal", sourceRecordId: { in: journals.map(journal => journal.id) } }, select: { sourceRecordId: true }, take: 501 }) : [];
  if (reversals.length > 500) throw new Error("Review duplicate journal reversals before reconciling.");
  const reversedIds = new Set(reversals.map(entry => entry.sourceRecordId));
  return { next: invoices.length > 50 ? page[49].recordKey : null, rows: page.map(invoice => {
    const linked = journals.filter(entry => entry.sourceRecordId === invoice.recordKey);
    let issue: string | null = null, total: number | null = null, tax: number | null = null;
    try {
      const data = invoice.data as Record<string, unknown>;
      const amounts = documentAmounts(kind, data);
      total = amounts.total; tax = amounts.tax;
      issue = kind !== "billing" && !ownParents.has(String(data[parentKey] ?? "")) ? "Linked invoice not found in this business" : linked.length === 0 ? "No linked journal" : linked.length > 1 ? "Multiple linked journals" : reversedIds.has(linked[0].id) ? "Linked journal was reversed — review required" : reconcileDocument(partnerId, kind, data, linked[0].entryDate, linked[0].lines);
    } catch (error) { issue = error instanceof Error ? error.message : "Invalid invoice"; }
    return { id: invoice.recordKey, total, tax, journal: linked.length === 1 ? linked[0].entryNumber : "", status: issue ?? "Amounts match", updatedAt: invoice.updatedAt.toISOString() };
  }) };
}

/** Attribute an existing reviewed posting; never creates or rewrites invoice amounts. */
export async function linkInvoiceJournal(partnerId: string, invoiceId: string, entryNumber: string, documentKind = "billing") {
  await access(partnerId);
  const kind = billingDocumentKind(documentKind);
  await assertPartnerCanWrite(partnerId);
  if (!invoiceId.trim() || invoiceId.length > 200 || !entryNumber.trim() || entryNumber.length > 200) throw new Error("Enter the invoice number and journal number.");
  return withRecordLock("accounting-ledger", partnerId, async () => {
    const invoice = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: kind, recordKey: invoiceId } } });
    const journal = await prisma.journalEntry.findUnique({ where: { partnerId_entryNumber: { partnerId, entryNumber } }, include: { lines } });
    if (!invoice || !journal) throw new Error("Invoice or journal not found in this business.");
    if (journal.sourceType === "journal-reversal" || await prisma.journalEntry.findFirst({ where: { partnerId, sourceType: "journal-reversal", sourceRecordId: journal.id }, select: { id: true } })) throw new Error("A reversed journal cannot be linked to an invoice. Review the correcting posting.");
    if ((journal.sourceType || journal.sourceRecordId) && (journal.sourceType !== kind || journal.sourceRecordId !== invoiceId)) throw new Error("This journal already has a different source.");
    if (await prisma.journalEntry.findFirst({ where: { partnerId, sourceType: kind, sourceRecordId: invoiceId, id: { not: journal.id } }, select: { id: true } })) throw new Error("This document already has a linked journal.");
    const data = invoice.data as Record<string, unknown>;
    if (kind !== "billing") {
      const parentId = String(data[kind === "billing-payments" ? "invoiceId" : "linkedInvoiceId"] ?? "");
      if (!parentId || !await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing", recordKey: parentId } }, select: { id: true } })) throw new Error("Linked invoice not found in this business.");
    }
    const error = reconcileDocument(partnerId, kind, data, journal.entryDate, journal.lines);
    if (error) throw new Error(error);
    await prisma.journalEntry.update({ where: { id: journal.id }, data: { sourceType: kind, sourceRecordId: invoiceId } });
  });
}

/** Explicit invoice-to-ledger posting with user-selected account roles. */
export async function postInvoiceJournal(partnerId: string, invoiceId: string, input: { receivableAccountId: string; revenueAccountId: string; taxAccountId?: string; entryNumber: string }) {
  await access(partnerId); await assertPartnerCanWrite(partnerId);
  return withRecordLock("accounting-ledger", partnerId, async () => {
    const invoice = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing", recordKey: invoiceId } } });
    if (!invoice) return { error: "Invoice not found." };
    const existing = await prisma.journalEntry.findFirst({ where: { partnerId, sourceType: "billing", sourceRecordId: invoiceId }, select: { entryNumber: true } });
    if (existing) return { error: `Invoice already has journal ${existing.entryNumber}.` };
    const data = invoice.data as Record<string, unknown>; let amounts;
    try { amounts = documentAmounts("billing", data); } catch (error) { return { error: error instanceof Error ? error.message : "Invoice is invalid." }; }
    const ids = [input.receivableAccountId, input.revenueAccountId, input.taxAccountId].filter((id): id is string => Boolean(id));
    const accounts = await prisma.chartOfAccount.findMany({ where: { partnerId, id: { in: ids }, isActive: true }, select: { id: true, accountType: true } });
    const byId = new Map(accounts.map(account => [account.id, account.accountType]));
    if (byId.get(input.receivableAccountId) !== "Asset") return { error: "Receivable account must be an active Asset account." };
    if (byId.get(input.revenueAccountId) !== "Income") return { error: "Revenue account must be an active Income account." };
    if (amounts.tax > 0 && (!input.taxAccountId || byId.get(input.taxAccountId) !== "Liability")) return { error: "Tax account must be an active Liability account when the invoice has tax." };
    if (!input.entryNumber.trim()) return { error: "Journal number is required." };
    const result = await createJournalEntry(partnerId, { entryNumber: input.entryNumber.trim(), entryDate: new Date(String(data.issueDate)), narration: `Invoice ${invoiceId}`, sourceType: "billing", sourceRecordId: invoiceId, lines: [{ accountId: input.receivableAccountId, debit: amounts.total, credit: 0 }, { accountId: input.revenueAccountId, debit: 0, credit: amounts.total - amounts.tax }, ...(amounts.tax > 0 && input.taxAccountId ? [{ accountId: input.taxAccountId, debit: 0, credit: amounts.tax }] : [])] });
    return result.error ? { error: result.error } : { entryNumber: result.entry?.entryNumber };
  });
}
