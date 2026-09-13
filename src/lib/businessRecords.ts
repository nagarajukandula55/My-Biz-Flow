/**
 * Generic, partner-scoped business record store — one Prisma table
 * (`BusinessRecord`) backs every module's actual data instead of a
 * bespoke model per module. A record's shape is whatever its module's
 * Column/FormFieldDef definitions say (see src/lib/sample-data/<slug>.ts)
 * — this layer just persists/scopes/looks it up, it doesn't know or care
 * about per-module field shape.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Row } from "@/components/DataTable";

function toRow(row: { recordKey: string; data: unknown }): Row {
  return { ...(row.data as Record<string, unknown>), id: row.recordKey };
}

export async function listBusinessRecords(partnerId: string, moduleSlug: string): Promise<Row[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

/** Default page size for `listBusinessRecordsPaginated` — one place to change it consistently. */
export const DEFAULT_BUSINESS_RECORD_PAGE_SIZE = 25;

export type BusinessRecordListOptions = {
  page?: number;
  pageSize?: number;
  /** Exact-match filters, keyed by field name inside the record's JSON `data` — blank/undefined values are ignored. */
  filters?: Record<string, string | undefined>;
  /** Case-insensitive substring search across the given JSON fields. */
  search?: { query: string; fields: string[] };
  /** Inclusive date-range filter over one JSON field holding an ISO date string. */
  dateRange?: { field: string; from?: string; to?: string };
};

export type PaginatedBusinessRecords = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Paginated + filtered variant of `listBusinessRecords`, for module list
 * pages backed by DataTable. Filters/search/date-range are applied to the
 * SAME query as the pagination (via Prisma JSON filtering on the `data`
 * column), so the filtered result set is what gets paginated — not the
 * unfiltered table.
 */
export async function listBusinessRecordsPaginated(
  partnerId: string,
  moduleSlug: string,
  options: BusinessRecordListOptions = {}
): Promise<PaginatedBusinessRecords> {
  const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : DEFAULT_BUSINESS_RECORD_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);

  const and: Prisma.BusinessRecordWhereInput[] = [];

  for (const [field, value] of Object.entries(options.filters ?? {})) {
    if (value) {
      and.push({ data: { path: [field], equals: value } as any });
    }
  }

  if (options.dateRange?.from) {
    and.push({ data: { path: [options.dateRange.field], gte: options.dateRange.from } as any });
  }
  if (options.dateRange?.to) {
    and.push({ data: { path: [options.dateRange.field], lte: options.dateRange.to } as any });
  }

  if (options.search?.query) {
    const query = options.search.query;
    and.push({
      OR: options.search.fields.map((field) => ({
        data: { path: [field], string_contains: query, mode: "insensitive" } as any,
      })),
    });
  }

  const where: Prisma.BusinessRecordWhereInput = {
    partnerId,
    moduleSlug,
    ...(and.length > 0 ? { AND: and } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.businessRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.businessRecord.count({ where }),
  ]);

  return {
    rows: rows.map(toRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBusinessRecord(
  partnerId: string,
  moduleSlug: string,
  recordKey: string
): Promise<Row | undefined> {
  const row = await prisma.businessRecord.findUnique({
    where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } },
  });
  return row ? toRow(row) : undefined;
}

/**
 * Batched lookup for the common "I have a list of record keys and need
 * each one's row" shape (e.g. invoice lines pointing at BOM materials) —
 * a single `findMany` + Map instead of one `getBusinessRecord` per item in
 * a loop. Missing keys are simply absent from the returned Map.
 */
export async function getBusinessRecordsByKeys(
  partnerId: string,
  moduleSlug: string,
  recordKeys: string[]
): Promise<Map<string, Row>> {
  const uniqueKeys = Array.from(new Set(recordKeys));
  if (uniqueKeys.length === 0) return new Map();
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug, recordKey: { in: uniqueKeys } },
  });
  return new Map(rows.map((row) => [row.recordKey, toRow(row)]));
}

/** Creates a record. If values.id is unset, generates one from the module slug + a short random suffix. */
export async function createBusinessRecord(
  partnerId: string,
  moduleSlug: string,
  values: Record<string, unknown>
): Promise<Row> {
  const recordKey =
    (values.id as string | undefined)?.trim() ||
    `${moduleSlug.toUpperCase().slice(0, 3)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const data = { ...values, id: recordKey };
  const row = await prisma.businessRecord.create({
    data: { partnerId, moduleSlug, recordKey, data },
  });
  return toRow(row);
}

export async function updateBusinessRecord(
  partnerId: string,
  moduleSlug: string,
  recordKey: string,
  values: Record<string, unknown>
): Promise<void> {
  const data = { ...values, id: recordKey };
  await prisma.businessRecord.update({
    where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } },
    data: { data },
  });
}

/** 0-based position of a record among its partner+module peers, oldest first — for document numbering sequence. */
export async function getBusinessRecordSequenceIndex(
  partnerId: string,
  moduleSlug: string,
  recordKey: string
): Promise<number> {
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug },
    orderBy: { createdAt: "asc" },
    select: { recordKey: true },
  });
  const index = rows.findIndex((r) => r.recordKey === recordKey);
  return index >= 0 ? index : 0;
}

export async function deleteBusinessRecord(partnerId: string, moduleSlug: string, recordKey: string): Promise<void> {
  await prisma.businessRecord.delete({
    where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } },
  });
}
