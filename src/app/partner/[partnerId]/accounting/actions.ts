"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getNextNumber } from "@/lib/designer/numbering";
import {
  createChartOfAccount,
  updateChartOfAccount,
  createFiscalPeriod,
  closeFiscalPeriod,
  reopenFiscalPeriod,
  createJournalEntry,
  updateJournalEntry,
  type ChartOfAccountInput,
  type AccountType,
  type JournalLineInput,
} from "@/lib/accounting";

function parseDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------
// Chart of Accounts
// ---------------------------------------------------------------------

export async function createChartOfAccountAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const accountCode = String(values["accountCode"] ?? "").trim();
  const accountName = String(values["accountName"] ?? "").trim();
  const accountType = String(values["accountType"] ?? "") as AccountType;
  if (!accountCode) return { error: "Account Code is required." };
  if (!accountName) return { error: "Account Name is required." };
  if (!accountType) return { error: "Account Type is required." };

  const input: ChartOfAccountInput = {
    accountCode,
    accountName,
    accountType,
    parentAccountId: values["parentAccountId"] ? String(values["parentAccountId"]) : null,
    isActive: values["isActive"] !== false,
  };

  let created;
  try {
    created = await createChartOfAccount(partnerId, input);
  } catch {
    return { error: "An account with this Account Code already exists." };
  }

  revalidatePath(`/partner/${partnerId}/accounting/chart-of-accounts`);
  redirect(`/partner/${partnerId}/accounting/chart-of-accounts/${created.id}/edit`);
}

export async function updateChartOfAccountAction(
  partnerId: string,
  accountId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const accountCode = String(values["accountCode"] ?? "").trim();
  const accountName = String(values["accountName"] ?? "").trim();
  const accountType = String(values["accountType"] ?? "") as AccountType;
  if (!accountCode) return { error: "Account Code is required." };
  if (!accountName) return { error: "Account Name is required." };
  if (!accountType) return { error: "Account Type is required." };

  const input: ChartOfAccountInput = {
    accountCode,
    accountName,
    accountType,
    parentAccountId: values["parentAccountId"] ? String(values["parentAccountId"]) : null,
    isActive: values["isActive"] !== false,
  };

  const updated = await updateChartOfAccount(partnerId, accountId, input);
  if (!updated) return { error: "Account not found." };

  revalidatePath(`/partner/${partnerId}/accounting/chart-of-accounts`);
  redirect(`/partner/${partnerId}/accounting/chart-of-accounts`);
}

// ---------------------------------------------------------------------
// Fiscal Periods
// ---------------------------------------------------------------------

export async function createFiscalPeriodAction(partnerId: string, values: Record<string, unknown>): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  const startDate = parseDate(values["startDate"]);
  const endDate = parseDate(values["endDate"]);
  if (!name) return { error: "Name is required." };
  if (!startDate || !endDate) return { error: "Start Date and End Date are required." };
  if (startDate > endDate) return { error: "Start Date must be on or before End Date." };

  await createFiscalPeriod(partnerId, { name, startDate, endDate });

  revalidatePath(`/partner/${partnerId}/accounting/fiscal-periods`);
  redirect(`/partner/${partnerId}/accounting/fiscal-periods`);
}

export async function closeFiscalPeriodAction(partnerId: string, id: string): Promise<{ error?: string }> {
  await requireSessionPartnerId(partnerId);
  const updated = await closeFiscalPeriod(partnerId, id);
  if (!updated) return { error: "Fiscal period not found." };
  revalidatePath(`/partner/${partnerId}/accounting/fiscal-periods`);
  return {};
}

export async function reopenFiscalPeriodAction(partnerId: string, id: string): Promise<{ error?: string }> {
  await requireSessionPartnerId(partnerId);
  const updated = await reopenFiscalPeriod(partnerId, id);
  if (!updated) return { error: "Fiscal period not found." };
  revalidatePath(`/partner/${partnerId}/accounting/fiscal-periods`);
  return {};
}

// ---------------------------------------------------------------------
// Journal Entries
// ---------------------------------------------------------------------

/** Converts client-typed rupee amounts (from JournalLinesEditor) into paise for storage. */
function toPaiseLines(lines: { accountId: string; debit: number; credit: number }[]): JournalLineInput[] {
  return lines.map((l) => ({
    accountId: l.accountId,
    debit: Math.round((Number(l.debit) || 0) * 100),
    credit: Math.round((Number(l.credit) || 0) * 100),
  }));
}

export async function createJournalEntryAction(
  partnerId: string,
  values: Record<string, unknown>,
  lines: { accountId: string; debit: number; credit: number }[]
): Promise<{ error?: string }> {
  await requireSessionPartnerId(partnerId);
  const entryDate = parseDate(values["entryDate"]) ?? new Date();
  const narration = values["narration"] ? String(values["narration"]) : null;

  const entryNumber = await getNextNumber("accounting.journal-entry", partnerId, { prefix: "JE" });

  const result = await createJournalEntry(partnerId, {
    entryNumber,
    entryDate,
    narration,
    lines: toPaiseLines(lines),
  });
  if (result.error || !result.entry) return { error: result.error ?? "Could not create journal entry." };

  revalidatePath(`/partner/${partnerId}/accounting/journal-entries`);
  redirect(`/partner/${partnerId}/accounting/journal-entries/${result.entry.id}`);
}

export async function updateJournalEntryAction(
  partnerId: string,
  entryId: string,
  values: Record<string, unknown>,
  lines: { accountId: string; debit: number; credit: number }[]
): Promise<{ error?: string }> {
  await requireSessionPartnerId(partnerId);
  const entryDate = parseDate(values["entryDate"]) ?? new Date();
  const narration = values["narration"] ? String(values["narration"]) : null;

  const result = await updateJournalEntry(partnerId, entryId, {
    entryDate,
    narration,
    lines: toPaiseLines(lines),
  });
  if (result.error || !result.entry) return { error: result.error ?? "Could not update journal entry." };

  revalidatePath(`/partner/${partnerId}/accounting/journal-entries`);
  revalidatePath(`/partner/${partnerId}/accounting/journal-entries/${entryId}`);
  redirect(`/partner/${partnerId}/accounting/journal-entries/${entryId}`);
}
