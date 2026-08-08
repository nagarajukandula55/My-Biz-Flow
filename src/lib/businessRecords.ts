/**
 * Generic, vendor-scoped business record store — one Prisma table
 * (`BusinessRecord`) backs every module's actual data instead of a
 * bespoke model per module. A record's shape is whatever its module's
 * Column/FormFieldDef definitions say (see src/lib/sample-data/<slug>.ts)
 * — this layer just persists/scopes/looks it up, it doesn't know or care
 * about per-module field shape.
 */
import { prisma } from "@/lib/prisma";
import type { Row } from "@/components/DataTable";

function toRow(row: { recordKey: string; data: unknown }): Row {
  return { ...(row.data as Record<string, unknown>), id: row.recordKey };
}

export async function listBusinessRecords(vendorId: string, moduleSlug: string): Promise<Row[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { vendorId, moduleSlug },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

export async function getBusinessRecord(
  vendorId: string,
  moduleSlug: string,
  recordKey: string
): Promise<Row | undefined> {
  const row = await prisma.businessRecord.findUnique({
    where: { vendorId_moduleSlug_recordKey: { vendorId, moduleSlug, recordKey } },
  });
  return row ? toRow(row) : undefined;
}

/** Creates a record. If values.id is unset, generates one from the module slug + a short random suffix. */
export async function createBusinessRecord(
  vendorId: string,
  moduleSlug: string,
  values: Record<string, unknown>
): Promise<Row> {
  const recordKey =
    (values.id as string | undefined)?.trim() ||
    `${moduleSlug.toUpperCase().slice(0, 3)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const data = { ...values, id: recordKey };
  const row = await prisma.businessRecord.create({
    data: { vendorId, moduleSlug, recordKey, data },
  });
  return toRow(row);
}

export async function updateBusinessRecord(
  vendorId: string,
  moduleSlug: string,
  recordKey: string,
  values: Record<string, unknown>
): Promise<void> {
  const data = { ...values, id: recordKey };
  await prisma.businessRecord.update({
    where: { vendorId_moduleSlug_recordKey: { vendorId, moduleSlug, recordKey } },
    data: { data },
  });
}

/** 0-based position of a record among its vendor+module peers, oldest first — for document numbering sequence. */
export async function getBusinessRecordSequenceIndex(
  vendorId: string,
  moduleSlug: string,
  recordKey: string
): Promise<number> {
  const rows = await prisma.businessRecord.findMany({
    where: { vendorId, moduleSlug },
    orderBy: { createdAt: "asc" },
    select: { recordKey: true },
  });
  const index = rows.findIndex((r) => r.recordKey === recordKey);
  return index >= 0 ? index : 0;
}

export async function deleteBusinessRecord(vendorId: string, moduleSlug: string, recordKey: string): Promise<void> {
  await prisma.businessRecord.delete({
    where: { vendorId_moduleSlug_recordKey: { vendorId, moduleSlug, recordKey } },
  });
}
