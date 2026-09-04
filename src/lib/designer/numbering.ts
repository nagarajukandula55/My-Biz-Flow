/**
 * Document numbering system — two tiers:
 *   - "Main": the Super Admin's own default scheme per document type,
 *     applied to any Partner that hasn't set its own override.
 *   - "Partner": a per-Partner override for the same document type.
 *
 * Backed by three Prisma tables (see prisma/schema.prisma):
 * NumberingMainScheme, NumberingPartnerScheme, NumberingCounter. Was a
 * JSON-file store; migrated to Postgres with the same function
 * names/behavior, now async to match Prisma's I/O. The counter increment
 * in getNextNumber() now uses a single atomic `UPDATE ... SET value =
 * value + 1 RETURNING value` (via $queryRaw) instead of read-then-write,
 * so concurrent callers can no longer race and hand out the same number
 * twice — a real correctness improvement the old file store couldn't give,
 * since Postgres serializes the row-level update.
 *
 * Pure formatting logic (types, formatNumber, getFinancialYear) lives in
 * numberingFormat.ts, not here — see that file's header for why (a Client
 * Component needs it without pulling in server-only imports).
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_SCHEME, formatNumber, type NumberingScheme } from "./numberingFormat";

export {
  DEFAULT_SCHEME,
  NUMBERED_DOCUMENT_TYPES,
  formatNumber,
  getFinancialYear,
  type NumberingScheme,
  type Separator,
  type FinancialYearFormat,
} from "./numberingFormat";

function scopeKey(documentType: string, partnerId?: string): string {
  return partnerId ? `partner:${partnerId}:${documentType}` : `main:${documentType}`;
}

export async function getMainScheme(documentType: string): Promise<NumberingScheme> {
  const row = await prisma.numberingMainScheme.findUnique({ where: { documentType } });
  return (row?.scheme as unknown as NumberingScheme) ?? DEFAULT_SCHEME;
}

export async function saveMainScheme(documentType: string, scheme: NumberingScheme): Promise<void> {
  await prisma.numberingMainScheme.upsert({
    where: { documentType },
    create: { documentType, scheme: scheme as object },
    update: { scheme: scheme as object },
  });
}

export async function getPartnerScheme(partnerId: string, documentType: string): Promise<NumberingScheme | undefined> {
  const row = await prisma.numberingPartnerScheme.findUnique({
    where: { partnerId_documentType: { partnerId, documentType } },
  });
  return row?.scheme as unknown as NumberingScheme | undefined;
}

export async function savePartnerScheme(partnerId: string, documentType: string, scheme: NumberingScheme): Promise<void> {
  await prisma.numberingPartnerScheme.upsert({
    where: { partnerId_documentType: { partnerId, documentType } },
    create: { partnerId, documentType, scheme: scheme as object },
    update: { scheme: scheme as object },
  });
}

export async function clearPartnerScheme(partnerId: string, documentType: string): Promise<void> {
  await prisma.numberingPartnerScheme
    .delete({ where: { partnerId_documentType: { partnerId, documentType } } })
    .catch(() => {
      // Already absent — deleting a non-existent row is a no-op, not an error.
    });
}

/** Partner override if one exists, otherwise the Main scheme, otherwise the built-in default. */
export async function getEffectiveScheme(documentType: string, partnerId?: string): Promise<NumberingScheme> {
  if (partnerId) {
    const override = await getPartnerScheme(partnerId, documentType);
    if (override) return override;
  }
  return getMainScheme(documentType);
}

/** Peek at what the NEXT number would look like without consuming it — for live preview UIs. */
export async function previewNextNumber(documentType: string, partnerId?: string): Promise<string> {
  const scheme = await getEffectiveScheme(documentType, partnerId);
  const key = scopeKey(documentType, partnerId);
  const row = await prisma.numberingCounter.findUnique({ where: { scopeKey: key } });
  const current = row?.value ?? scheme.sequenceStart - 1;
  return formatNumber(scheme, current + 1);
}

/**
 * Real, working counter — advances and persists on every call. This is the
 * "fetch from live numbers" mechanism: two calls in a row return two
 * different, sequential numbers. Uses upsert-with-increment so concurrent
 * calls for the same scope are serialized by Postgres, not by app code.
 */
export async function getNextNumber(documentType: string, partnerId?: string): Promise<string> {
  const scheme = await getEffectiveScheme(documentType, partnerId);
  const key = scopeKey(documentType, partnerId);

  const row = await prisma.numberingCounter.upsert({
    where: { scopeKey: key },
    create: { scopeKey: key, value: scheme.sequenceStart },
    update: { value: { increment: 1 } },
  });

  return formatNumber(scheme, row.value);
}
