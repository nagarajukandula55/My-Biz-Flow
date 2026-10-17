import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { isDateInClosedPeriod, validateJournalLines } from "@/lib/accounting";

export async function reverseJournal(partnerId: string, originalId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "accounting");
  await assertPartnerCanWrite(partnerId);
  const dateText = String(values.reversalDate ?? ""), reason = String(values.reason ?? "").trim();
  const entryDate = new Date(`${dateText}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !Number.isFinite(entryDate.getTime()) || entryDate.toISOString().slice(0,10) !== dateText) throw new Error("Choose a valid reversal date.");
  if (reason.length < 5 || reason.length > 2000) throw new Error("Enter a reversal reason between 5 and 2,000 characters.");
  return withRecordLock("accounting-ledger", partnerId, async () => {
    const original = await prisma.journalEntry.findFirst({ where: { id: originalId, partnerId }, include: { lines: { include: { account: { select: { partnerId: true } } } } } });
    if (!original) throw new Error("Journal entry not found.");
    if (original.sourceType === "journal-reversal") throw new Error("A reversal cannot itself be reversed. Post a separately reviewed correcting journal.");
    const existing = await prisma.journalEntry.findFirst({ where: { partnerId, sourceType: "journal-reversal", sourceRecordId: originalId } });
    const narration = `Reversal of ${original.entryNumber}: ${reason}`;
    if (existing) {
      if (existing.entryDate.getTime() !== entryDate.getTime() || existing.narration !== narration) throw new Error("This journal has already been reversed. Open its existing reversal.");
      return existing;
    }
    if (entryDate < new Date(original.entryDate.toISOString().slice(0,10))) throw new Error("Reversal date cannot precede the original journal date.");
    if (await isDateInClosedPeriod(partnerId, entryDate)) throw new Error("The reversal date is in a closed fiscal period. Choose an open period.");
    if (original.lines.some(line => line.account.partnerId !== partnerId)) throw new Error("Original accounts require a tenant ownership review.");
    const reversed = original.lines.map(line => ({ accountId: line.accountId, debit: line.credit, credit: line.debit }));
    const issue = validateJournalLines(reversed);
    if (issue) throw new Error(`Original journal cannot be reversed: ${issue}`);
    const entry = await prisma.journalEntry.create({ data: { partnerId, entryNumber: `REV-${original.id}`, entryDate, narration, sourceType: "journal-reversal", sourceRecordId: original.id, lines: { create: reversed } } });
    await prisma.businessRecord.create({ data: { partnerId, moduleSlug: "accounting-reversal-audit", recordKey: entry.id, data: { originalId: original.id, reversalId: entry.id, reason, actor: `Owner ${partnerId}`, at: new Date().toISOString(), reversalDate: dateText, originalEntryNumber: original.entryNumber, lines: reversed } } });
    return entry;
  });
}
