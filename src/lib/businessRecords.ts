/**
 * Generic, partner-scoped business record store — one Prisma table
 * (`BusinessRecord`) backs every module's actual data instead of a
 * bespoke model per module. A record's shape is whatever its module's
 * Column/FormFieldDef definitions say (see src/lib/sample-data/<slug>.ts)
 * — this layer just persists/scopes/looks it up, it doesn't know or care
 * about per-module field shape.
 */
import { safeCache as cache } from "@/lib/safeCache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Row } from "@/components/DataTable";
import { assertPartnerCanWrite } from "@/lib/tenant";

function toRow(row: { recordKey: string; data: unknown; createdAt: Date }): Row {
  // `recordCreatedAt` is the real, immutable DB insert timestamp (full
  // date+time) — always placed AFTER the data spread so it wins over any
  // stray same-named copy that got persisted into the JSON blob by an
  // earlier `{...existing, ...patch}` write-back (see updateBusinessRecord).
  // Added so callers have a genuine full-precision "when was this record
  // actually created" moment to use for TAT/timeline purposes, instead of
  // relying on a user-entered, date-only field like `receivedDate` (which
  // has no time-of-day component at all).
  return { ...(row.data as Record<string, unknown>), id: row.recordKey, recordCreatedAt: row.createdAt.toISOString() };
}

/**
 * Wrapped in React's cache() — several pages/functions call
 * listBusinessRecords(partnerId, moduleSlug) for the SAME moduleSlug more
 * than once within one request (e.g. the Analytics page: getAnalyticsSummary,
 * getWorkorderStatusBreakdown, getTopBrandsByWorkorderCount, getAverageTat,
 * getRevenueBySource and getInvoiceStatusBreakdown in analyticsData.ts all
 * read the same full unfiltered "service-centre"/"billing" table for the
 * same partner on the same render). Dedup is per-request only, same as
 * getPartner() — no cross-request staleness risk.
 */
export const listBusinessRecords = cache(async function listBusinessRecords(
  partnerId: string,
  moduleSlug: string
): Promise<Row[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
});

/**
 * Like `listBusinessRecords`, but narrows at the Prisma query level to rows
 * whose given JSON date field is on/after `sinceIso` — for callers (e.g.
 * Part Planning's consumption-based forecast) that only need a trailing
 * window out of a table that can grow large, instead of pulling the whole
 * moduleSlug history into memory and filtering client-side.
 */
export async function listBusinessRecordsSince(
  partnerId: string,
  moduleSlug: string,
  dateField: string,
  sinceIso: string
): Promise<Row[]> {
  const rows = await prisma.businessRecord.findMany({
    where: {
      partnerId,
      moduleSlug,
      data: { path: [dateField], gte: sinceIso } as any,
    },
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
 * Mirrors one `and` entry built below (exact-match / date-range `data` JSON
 * path filters) as a raw SQL fragment, for the search path which has to
 * drop to `$queryRaw` (see listBusinessRecordsPaginated) since Prisma's JSON
 * filtering can't combine with the ILIKE search condition in one query.
 */
function filterToSql(clause: Prisma.BusinessRecordWhereInput): Prisma.Sql {
  const data = (clause as any).data as { path: string[]; equals?: string; gte?: string; lte?: string };
  const field = data.path[0];
  if (data.equals !== undefined) return Prisma.sql`"data"->>${field} = ${data.equals}`;
  if (data.gte !== undefined) return Prisma.sql`"data"->>${field} >= ${data.gte}`;
  return Prisma.sql`"data"->>${field} <= ${data.lte}`;
}

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

  const where: Prisma.BusinessRecordWhereInput = {
    partnerId,
    moduleSlug,
    ...(and.length > 0 ? { AND: and } : {}),
  };

  // `mode: "insensitive"` combined with a JSON `path` filter is rejected at
  // runtime by this Prisma/Postgres combo ("Unknown argument mode") even
  // though it type-checks (the old code cast it `as any`). Pushed down to
  // the DB instead via a raw `ILIKE` against each field — `recordKey` for
  // the synthetic "id" field, `data->>'field'` (JSON text extraction) for
  // everything else — OR'd together, so search stays bounded by LIMIT/OFFSET
  // like every other filter instead of pulling the whole table into memory.
  if (options.search?.query) {
    const query = options.search.query;
    const fields = options.search.fields;
    const andConditions: Prisma.Sql[] = and.map((clause) => filterToSql(clause));
    const searchConditions = fields.map((field) =>
      field === "id"
        ? Prisma.sql`"recordKey" ILIKE ${"%" + query + "%"}`
        : Prisma.sql`"data"->>${field} ILIKE ${"%" + query + "%"}`
    );
    const whereSql = Prisma.sql`
      "partnerId" = ${partnerId} AND "moduleSlug" = ${moduleSlug}
      ${andConditions.length > 0 ? Prisma.sql`AND ${Prisma.join(andConditions, " AND ")}` : Prisma.empty}
      AND (${Prisma.join(searchConditions, " OR ")})
    `;
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<{ recordKey: string; data: unknown; createdAt: Date }[]>(Prisma.sql`
        SELECT "recordKey", "data", "createdAt" FROM "business_records"
        WHERE ${whereSql}
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "business_records" WHERE ${whereSql}
      `),
    ]);
    const total = Number(countRows[0]?.count ?? 0);
    return {
      rows: rows.map(toRow),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

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

/**
 * Modules whose "auto-generated if left empty" id should be a real,
 * sequential, per-partner number (via the same NumberingCounter scheme
 * Workorders/Invoices use — src/lib/designer/numbering.ts) instead of a
 * random suffix. Random ids were fine as an opaque key, but the catalogs
 * below are shown to and referenced by the partner (a Brand Code, Model
 * Code, or Material Code on a printed document/report), so they should
 * read as a real, incrementing sequence — never colliding with another
 * partner's catalog since the counter is scoped by partnerId, and never
 * reusing a number within one partner's own catalog either.
 */
const NUMBERED_MODULE_SLUGS: Record<string, string> = {
  "service-centre-brands": "service-centre.brand",
  "service-centre-models": "service-centre.model",
  "service-centre-inquiry": "service-centre.inquiry",
  "inventory-bom": "inventory.bom-material",
};

/** Creates a record. If values.id is unset, generates one — a real per-partner sequence for catalog modules (see NUMBERED_MODULE_SLUGS), a short random suffix for everything else. */
export async function createBusinessRecord(
  partnerId: string,
  moduleSlug: string,
  values: Record<string, unknown>
): Promise<Row> {
  await assertPartnerCanWrite(partnerId);
  let recordKey = (values.id as string | undefined)?.trim();
  if (!recordKey) {
    const documentType = NUMBERED_MODULE_SLUGS[moduleSlug];
    if (documentType) {
      const { getNextNumber } = await import("@/lib/designer/numbering");
      const prefix =
        moduleSlug === "inventory-bom"
          ? "MAT"
          : moduleSlug === "service-centre-brands"
            ? "BRD"
            : moduleSlug === "service-centre-inquiry"
              ? "INQ"
              : "MDL";
      recordKey = await getNextNumber(documentType, partnerId, {
        prefix,
        sequenceDigits: 4,
        financialYearFormat: "none",
      });
    } else {
      recordKey = `${moduleSlug.toUpperCase().slice(0, 3)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }
  }
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
  await assertPartnerCanWrite(partnerId);
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

/**
 * Same 0-based, oldest-first position as getBusinessRecordSequenceIndex,
 * but scoped to only the peers matching `filterFn` — e.g. only this
 * partner's B2B invoices, or only its B2C ones — so B2B and B2C invoices
 * (Billing and Service Centre alike) get their own independent, gap-free
 * numbering sequence instead of interleaving in one shared count. `data`
 * is the record's own field bag (same shape `getBusinessRecord` returns
 * minus `id`), so `filterFn` can check e.g. `Boolean(data.customerGstin)`.
 */
export async function getBusinessRecordSequenceIndexFiltered(
  partnerId: string,
  moduleSlug: string,
  recordKey: string,
  filterFn: (data: Record<string, unknown>) => boolean
): Promise<number> {
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug },
    orderBy: { createdAt: "asc" },
    select: { recordKey: true, data: true },
  });
  const filtered = rows.filter((r) => filterFn(r.data as Record<string, unknown>));
  const index = filtered.findIndex((r) => r.recordKey === recordKey);
  return index >= 0 ? index : 0;
}

export async function deleteBusinessRecord(partnerId: string, moduleSlug: string, recordKey: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  await prisma.businessRecord.delete({
    where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } },
  });
}
