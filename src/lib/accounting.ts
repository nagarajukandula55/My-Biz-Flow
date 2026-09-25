/**
 * Accounting (General Ledger) module's Prisma-backed data layer —
 * ChartOfAccount, JournalEntry/JournalLine, FiscalPeriod (see
 * prisma/schema.prisma). A standalone double-entry ledger module, distinct
 * from the existing `accounting-gst` module (GST returns/HSN summary/ITC
 * register) — this file never touches that module's data or tables.
 *
 * Every read/write here is partner-scoped by an explicit `partnerId: ...`
 * where clause (assertPartnerScope's convention — see src/lib/tenant.ts),
 * same as src/lib/manufacturing.ts. Money fields (JournalLine.debit/credit)
 * are Int paise, matching this schema's usual convention.
 *
 * Double-entry balance (sum of debits === sum of credits across an entry's
 * lines) and fiscal-period-closed enforcement both live here, in
 * createJournalEntry/updateJournalEntry, so every caller gets them for
 * free rather than re-implementing the check per action.
 */
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------
// Chart of Accounts
// ---------------------------------------------------------------------

export const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type ChartOfAccountRecord = {
  id: string;
  partnerId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountId: string | null;
  parentAccountName: string | null;
  isActive: boolean;
};

export async function listChartOfAccounts(partnerId: string): Promise<ChartOfAccountRecord[]> {
  const rows = await prisma.chartOfAccount.findMany({
    where: { partnerId },
    include: { parentAccount: { select: { accountName: true } } },
    orderBy: [{ accountType: "asc" }, { accountCode: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    partnerId: r.partnerId,
    accountCode: r.accountCode,
    accountName: r.accountName,
    accountType: r.accountType,
    parentAccountId: r.parentAccountId,
    parentAccountName: r.parentAccount?.accountName ?? null,
    isActive: r.isActive,
  }));
}

export async function getChartOfAccount(partnerId: string, id: string): Promise<ChartOfAccountRecord | null> {
  const r = await prisma.chartOfAccount.findFirst({
    where: { id, partnerId },
    include: { parentAccount: { select: { accountName: true } } },
  });
  if (!r) return null;
  return {
    id: r.id,
    partnerId: r.partnerId,
    accountCode: r.accountCode,
    accountName: r.accountName,
    accountType: r.accountType,
    parentAccountId: r.parentAccountId,
    parentAccountName: r.parentAccount?.accountName ?? null,
    isActive: r.isActive,
  };
}

export type ChartOfAccountInput = {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentAccountId?: string | null;
  isActive?: boolean;
};

export async function createChartOfAccount(partnerId: string, input: ChartOfAccountInput): Promise<ChartOfAccountRecord> {
  const created = await prisma.chartOfAccount.create({
    data: {
      partnerId,
      accountCode: input.accountCode,
      accountName: input.accountName,
      accountType: input.accountType,
      parentAccountId: input.parentAccountId || null,
      isActive: input.isActive ?? true,
    },
  });
  return { ...created, parentAccountName: null };
}

export async function updateChartOfAccount(
  partnerId: string,
  id: string,
  input: ChartOfAccountInput
): Promise<ChartOfAccountRecord | null> {
  const existing = await prisma.chartOfAccount.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  // An account can't be its own parent — a plain self-check; deeper cycle
  // detection (grandparent chains) is not attempted here, same scope as
  // this pass's other modules' hierarchy fields.
  const parentAccountId = input.parentAccountId && input.parentAccountId !== id ? input.parentAccountId : null;
  const updated = await prisma.chartOfAccount.update({
    where: { id },
    data: {
      accountCode: input.accountCode,
      accountName: input.accountName,
      accountType: input.accountType,
      parentAccountId,
      isActive: input.isActive ?? true,
    },
  });
  return getChartOfAccount(partnerId, updated.id);
}

// ---------------------------------------------------------------------
// Fiscal Periods
// ---------------------------------------------------------------------

export type FiscalPeriodRecord = {
  id: string;
  partnerId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
};

export async function listFiscalPeriods(partnerId: string): Promise<FiscalPeriodRecord[]> {
  return prisma.fiscalPeriod.findMany({ where: { partnerId }, orderBy: { startDate: "desc" } });
}

export async function getFiscalPeriod(partnerId: string, id: string): Promise<FiscalPeriodRecord | null> {
  return prisma.fiscalPeriod.findFirst({ where: { id, partnerId } });
}

export async function createFiscalPeriod(
  partnerId: string,
  input: { name: string; startDate: Date; endDate: Date }
): Promise<FiscalPeriodRecord> {
  return prisma.fiscalPeriod.create({
    data: { partnerId, name: input.name, startDate: input.startDate, endDate: input.endDate, isClosed: false },
  });
}

export async function closeFiscalPeriod(partnerId: string, id: string): Promise<FiscalPeriodRecord | null> {
  const existing = await prisma.fiscalPeriod.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  return prisma.fiscalPeriod.update({ where: { id }, data: { isClosed: true } });
}

export async function reopenFiscalPeriod(partnerId: string, id: string): Promise<FiscalPeriodRecord | null> {
  const existing = await prisma.fiscalPeriod.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  return prisma.fiscalPeriod.update({ where: { id }, data: { isClosed: false } });
}

/**
 * Fail-closed check: is `date` inside any CLOSED fiscal period for this
 * partner? Every JournalEntry create/update calls this before writing —
 * a closed period blocks both, not just new entries (CLAUDE.md's
 * "real accounting-close enforcement" requirement).
 */
export async function isDateInClosedPeriod(partnerId: string, date: Date): Promise<boolean> {
  const hit = await prisma.fiscalPeriod.findFirst({
    where: { partnerId, isClosed: true, startDate: { lte: date }, endDate: { gte: date } },
  });
  return !!hit;
}

// ---------------------------------------------------------------------
// Journal Entries
// ---------------------------------------------------------------------

export type JournalLineRecord = {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number; // paise
  credit: number; // paise
};

export type JournalEntryRecord = {
  id: string;
  partnerId: string;
  entryNumber: string;
  entryDate: Date;
  narration: string | null;
  sourceType: string | null;
  sourceRecordId: string | null;
  createdAt: Date;
  lines: JournalLineRecord[];
  totalDebit: number;
  totalCredit: number;
};

function toJournalEntryRecord(row: {
  id: string;
  partnerId: string;
  entryNumber: string;
  entryDate: Date;
  narration: string | null;
  sourceType: string | null;
  sourceRecordId: string | null;
  createdAt: Date;
  lines: { id: string; journalEntryId: string; accountId: string; debit: number; credit: number; account: { accountName: string; accountCode: string } }[];
}): JournalEntryRecord {
  const lines = row.lines.map((l) => ({
    id: l.id,
    journalEntryId: l.journalEntryId,
    accountId: l.accountId,
    accountName: l.account.accountName,
    accountCode: l.account.accountCode,
    debit: l.debit,
    credit: l.credit,
  }));
  return {
    id: row.id,
    partnerId: row.partnerId,
    entryNumber: row.entryNumber,
    entryDate: row.entryDate,
    narration: row.narration,
    sourceType: row.sourceType,
    sourceRecordId: row.sourceRecordId,
    createdAt: row.createdAt,
    lines,
    totalDebit: lines.reduce((s, l) => s + l.debit, 0),
    totalCredit: lines.reduce((s, l) => s + l.credit, 0),
  };
}

const JOURNAL_ENTRY_INCLUDE = { lines: { include: { account: { select: { accountName: true, accountCode: true } } } } } as const;

export async function listJournalEntries(partnerId: string): Promise<JournalEntryRecord[]> {
  const rows = await prisma.journalEntry.findMany({
    where: { partnerId },
    include: JOURNAL_ENTRY_INCLUDE,
    orderBy: { entryDate: "desc" },
  });
  return rows.map(toJournalEntryRecord);
}

export async function getJournalEntry(partnerId: string, id: string): Promise<JournalEntryRecord | null> {
  const row = await prisma.journalEntry.findFirst({ where: { id, partnerId }, include: JOURNAL_ENTRY_INCLUDE });
  return row ? toJournalEntryRecord(row) : null;
}

export type JournalLineInput = { accountId: string; debit: number; credit: number };

/**
 * Validates a proposed line set BEFORE any write: every line must be
 * either a debit OR a credit (not both, not neither), and the entry's
 * total debits must equal its total credits — real double-entry
 * correctness, not optional. Returns an error string, or null if valid.
 */
export function validateJournalLines(lines: JournalLineInput[]): string | null {
  if (lines.length < 2) return "A journal entry needs at least two lines.";
  for (const line of lines) {
    if (!line.accountId) return "Every line must have an account selected.";
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;
    if (hasDebit && hasCredit) return "A line cannot have both a debit and a credit amount — enter only one.";
    if (!hasDebit && !hasCredit) return "Every line must have either a debit or a credit amount greater than zero.";
  }
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (totalDebit !== totalCredit) {
    return `Entry is not balanced: total debit ₹${(totalDebit / 100).toFixed(2)} does not equal total credit ₹${(totalCredit / 100).toFixed(2)}.`;
  }
  return null;
}

export async function createJournalEntry(
  partnerId: string,
  input: { entryNumber: string; entryDate: Date; narration?: string | null; sourceType?: string | null; sourceRecordId?: string | null; lines: JournalLineInput[] }
): Promise<{ entry?: JournalEntryRecord; error?: string }> {
  const balanceError = validateJournalLines(input.lines);
  if (balanceError) return { error: balanceError };

  if (await isDateInClosedPeriod(partnerId, input.entryDate)) {
    return { error: "Entry Date falls inside a closed fiscal period — reopen the period before posting to it." };
  }

  const created = await prisma.journalEntry.create({
    data: {
      partnerId,
      entryNumber: input.entryNumber,
      entryDate: input.entryDate,
      narration: input.narration || null,
      sourceType: input.sourceType || null,
      sourceRecordId: input.sourceRecordId || null,
      lines: { create: input.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })) },
    },
    include: JOURNAL_ENTRY_INCLUDE,
  });
  return { entry: toJournalEntryRecord(created) };
}

/**
 * Replaces an existing JournalEntry's header + full line set (delete +
 * recreate, same convention as manufacturing.ts's updateBom). Re-validates
 * balance AND re-checks both the OLD and NEW entryDate against closed
 * fiscal periods — fail-closed: an entry already sitting inside a closed
 * period cannot be edited even if the new date would fall outside one, and
 * a still-open entry cannot be moved INTO a closed period.
 */
export async function updateJournalEntry(
  partnerId: string,
  id: string,
  input: { entryDate: Date; narration?: string | null; lines: JournalLineInput[] }
): Promise<{ entry?: JournalEntryRecord; error?: string }> {
  const existing = await prisma.journalEntry.findFirst({ where: { id, partnerId } });
  if (!existing) return { error: "Journal entry not found." };

  const balanceError = validateJournalLines(input.lines);
  if (balanceError) return { error: balanceError };

  if (await isDateInClosedPeriod(partnerId, existing.entryDate)) {
    return { error: "This entry's current date falls inside a closed fiscal period — it can no longer be edited." };
  }
  if (await isDateInClosedPeriod(partnerId, input.entryDate)) {
    return { error: "The new Entry Date falls inside a closed fiscal period — choose a date outside a closed period." };
  }

  await prisma.$transaction([
    prisma.journalLine.deleteMany({ where: { journalEntryId: id } }),
    prisma.journalEntry.update({
      where: { id },
      data: {
        entryDate: input.entryDate,
        narration: input.narration || null,
        lines: { create: input.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })) },
      },
    }),
  ]);
  const entry = await getJournalEntry(partnerId, id);
  return entry ? { entry } : { error: "Journal entry not found after update." };
}

// ---------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------

export type TrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number; // paise
  totalCredit: number; // paise
};

/** Every account with its summed debit/credit across JournalLines, optionally date-filtered by the parent entry's entryDate. */
export async function getTrialBalance(
  partnerId: string,
  range?: { from?: Date; to?: Date }
): Promise<TrialBalanceRow[]> {
  const accounts = await prisma.chartOfAccount.findMany({ where: { partnerId }, orderBy: [{ accountType: "asc" }, { accountCode: "asc" }] });
  const entryDateFilter =
    range?.from || range?.to
      ? { entryDate: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
      : {};

  const rows: TrialBalanceRow[] = [];
  for (const acc of accounts) {
    const agg = await prisma.journalLine.aggregate({
      where: { accountId: acc.id, journalEntry: { partnerId, ...entryDateFilter } },
      _sum: { debit: true, credit: true },
    });
    rows.push({
      accountId: acc.id,
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      totalDebit: agg._sum.debit ?? 0,
      totalCredit: agg._sum.credit ?? 0,
    });
  }
  return rows;
}

export type ProfitAndLoss = {
  incomeRows: TrialBalanceRow[];
  expenseRows: TrialBalanceRow[];
  totalIncome: number; // paise
  totalExpense: number; // paise
  netProfit: number; // paise
};

/**
 * Income accounts run credit-normal (balance = credit − debit); Expense
 * accounts run debit-normal (balance = debit − credit) — standard GL sign
 * convention, applied here via each row's totalCredit/totalDebit rather
 * than a stored running balance.
 */
export async function getProfitAndLoss(partnerId: string, range?: { from?: Date; to?: Date }): Promise<ProfitAndLoss> {
  const trialBalance = await getTrialBalance(partnerId, range);
  const incomeRows = trialBalance.filter((r) => r.accountType === "Income");
  const expenseRows = trialBalance.filter((r) => r.accountType === "Expense");
  const totalIncome = incomeRows.reduce((s, r) => s + (r.totalCredit - r.totalDebit), 0);
  const totalExpense = expenseRows.reduce((s, r) => s + (r.totalDebit - r.totalCredit), 0);
  return { incomeRows, expenseRows, totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
}

export type BalanceSheet = {
  assetRows: TrialBalanceRow[];
  liabilityRows: TrialBalanceRow[];
  equityRows: TrialBalanceRow[];
  totalAssets: number; // paise
  totalLiabilities: number; // paise
  totalEquity: number; // paise
};

/**
 * Asset accounts run debit-normal (balance = debit − credit); Liability
 * and Equity accounts run credit-normal (balance = credit − debit) — as
 * of `asOf` (every JournalLine on an entry dated on/before asOf).
 */
export async function getBalanceSheet(partnerId: string, asOf: Date): Promise<BalanceSheet> {
  const trialBalance = await getTrialBalance(partnerId, { to: asOf });
  const assetRows = trialBalance.filter((r) => r.accountType === "Asset");
  const liabilityRows = trialBalance.filter((r) => r.accountType === "Liability");
  const equityRows = trialBalance.filter((r) => r.accountType === "Equity");
  const totalAssets = assetRows.reduce((s, r) => s + (r.totalDebit - r.totalCredit), 0);
  const totalLiabilities = liabilityRows.reduce((s, r) => s + (r.totalCredit - r.totalDebit), 0);
  const totalEquity = equityRows.reduce((s, r) => s + (r.totalCredit - r.totalDebit), 0);
  return { assetRows, liabilityRows, equityRows, totalAssets, totalLiabilities, totalEquity };
}
