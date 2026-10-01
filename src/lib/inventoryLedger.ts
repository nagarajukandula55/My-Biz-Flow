/**
 * Data-access layer for the Pro+ Inventory money ledger (InventoryTransaction
 * — see prisma/schema.prisma), a table physically shared with the separate
 * My-Biz-Flow-Admin app (same live Postgres DB — see that app's
 * src/lib/inventoryLedger.ts for the reference implementation this file
 * mirrors). Foundations-only for this stage: no page/UI here yet — later
 * stages wire recordInventoryTransaction() into Stock Take, Stock
 * Adjustments, Stock Transfers, Return Orders, and Part Orders.
 *
 * Amounts are paise (Int), matching this schema's existing money convention
 * (e.g. ServiceLine.priceAmount, SubscriptionPayment.amount).
 */
import { prisma } from "@/lib/prisma";

export type InventorySourceType =
  | "stock-adjustment"
  | "stock-transfer"
  | "return-order"
  | "part-order"
  | "stock-take";

export type InventoryTransactionDirection = "debit" | "credit";

export type RecordInventoryTransactionInput = {
  partnerId: string;
  sourceType: InventorySourceType;
  sourceRecordId: string;
  direction: InventoryTransactionDirection;
  /** Paise. */
  amount: number;
  description: string;
  /** Defaults to now() when omitted. */
  occurredAt?: Date;
};

export type InventoryTransactionRow = {
  id: string;
  partnerId: string;
  sourceType: string;
  sourceRecordId: string;
  direction: InventoryTransactionDirection;
  amount: number;
  description: string;
  occurredAt: string;
  createdAt: string;
};

/**
 * Idempotent upsert keyed on (partnerId, sourceRecordId, sourceType) — the
 * InventoryTransaction table's @@unique constraint. Calling this twice for
 * the same document/source-type pair replaces the prior row rather than
 * creating a duplicate ledger entry.
 */
export async function recordInventoryTransaction(input: RecordInventoryTransactionInput): Promise<InventoryTransactionRow> {
  const occurredAt = input.occurredAt ?? new Date();
  const row = await prisma.inventoryTransaction.upsert({
    where: {
      partnerId_sourceRecordId_sourceType: {
        partnerId: input.partnerId,
        sourceRecordId: input.sourceRecordId,
        sourceType: input.sourceType,
      },
    },
    update: {
      direction: input.direction,
      amount: input.amount,
      description: input.description,
      occurredAt,
    },
    create: {
      partnerId: input.partnerId,
      sourceType: input.sourceType,
      sourceRecordId: input.sourceRecordId,
      direction: input.direction,
      amount: input.amount,
      description: input.description,
      occurredAt,
    },
  });
  return {
    id: row.id,
    partnerId: row.partnerId,
    sourceType: row.sourceType,
    sourceRecordId: row.sourceRecordId,
    direction: row.direction as InventoryTransactionDirection,
    amount: row.amount,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export type InventoryStatementFilters = {
  from?: Date;
  to?: Date;
  sourceType?: InventorySourceType;
};

export type InventoryStatement = {
  rows: InventoryTransactionRow[];
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Matches DEFAULT_BUSINESS_RECORD_PAGE_SIZE's convention (src/lib/businessRecords.ts). */
export const DEFAULT_LEDGER_PAGE_SIZE = 25;

/**
 * Credit increases the balance (stock value coming in / cost recovered),
 * debit decreases it — same sign convention a simple running ledger uses.
 * Every inventory money movement lands here with no natural ceiling, and
 * its only caller (inventory/transactions/page.tsx) renders the rows as a
 * table, so the row list is paginated — but totalDebit/totalCredit/
 * netBalance are whole-statement aggregates over the filtered set (computed
 * via a separate groupBy, not just the current page), matching what a
 * running ledger total means.
 */
export async function getInventoryStatement(
  partnerId: string,
  filters?: InventoryStatementFilters,
  pagination?: { page?: number; pageSize?: number }
): Promise<InventoryStatement> {
  const page = Math.max(1, pagination?.page ?? 1);
  const pageSize = pagination?.pageSize ?? DEFAULT_LEDGER_PAGE_SIZE;
  const where = {
    partnerId,
    ...(filters?.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters?.from || filters?.to
      ? {
          occurredAt: {
            ...(filters?.from ? { gte: filters.from } : {}),
            ...(filters?.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total, totals] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.groupBy({ by: ["direction"], where, _sum: { amount: true } }),
  ]);

  const totalDebit = totals.find((t) => t.direction === "debit")?._sum.amount ?? 0;
  const totalCredit = totals.find((t) => t.direction === "credit")?._sum.amount ?? 0;

  const mapped: InventoryTransactionRow[] = rows.map((row) => ({
    id: row.id,
    partnerId: row.partnerId,
    sourceType: row.sourceType,
    sourceRecordId: row.sourceRecordId,
    direction: row.direction as InventoryTransactionDirection,
    amount: row.amount,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    rows: mapped,
    totalDebit,
    totalCredit,
    netBalance: totalCredit - totalDebit,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
