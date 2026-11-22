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
import type { Prisma } from "@prisma/client";
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

/**
 * GST/Non-GST numbering replaced the older B2B/B2C streams. Keep a one-time
 * handover path so businesses continue their established document sequence
 * and formatting rather than unexpectedly restarting from 0001.
 */
const LEGACY_INVOICE_DOCUMENT_TYPE: Record<string, string | undefined> = {
  "invoice.gst": "invoice.b2b",
  "invoice.non-gst": "invoice.b2c",
};

function defaultsForDocument(documentType: string, defaults?: Partial<NumberingScheme>): Partial<NumberingScheme> | undefined {
  const invoiceDefaults = documentType === "invoice.gst"
    ? { prefix: "INV" }
    : documentType === "invoice.non-gst"
      ? { prefix: "BILL" }
      : undefined;
  if (!invoiceDefaults && !defaults) return undefined;
  return { ...invoiceDefaults, ...defaults };
}

/**
 * A counter is normally the source of truth. Older invoice rows can however
 * have been imported or manually created with a higher visible serial than
 * the legacy counter. When a new GST/non-GST stream is first opened, use the
 * highest already-issued document that matches its active format as a floor.
 * This makes the handover safe even for such historical data.
 */
function invoiceSequenceFromNumber(invoiceNumber: string, scheme: NumberingScheme): number | undefined {
  const marker = "2147483647";
  const formattedMarker = formatNumber(scheme, Number(marker));
  const markerIndex = formattedMarker.lastIndexOf(marker);
  if (markerIndex < 0) return undefined;
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^${escapeRegex(formattedMarker.slice(0, markerIndex))}(\\d+)${escapeRegex(formattedMarker.slice(markerIndex + marker.length))}$`
  );
  const matched = invoiceNumber.match(pattern);
  if (!matched) return undefined;
  const sequence = Number(matched[1]);
  return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : undefined;
}

async function highestIssuedInvoiceSequence(
  partnerId: string,
  scheme: NumberingScheme,
  client: Prisma.TransactionClient = prisma
): Promise<number | undefined> {
  const records = await client.businessRecord.findMany({
    where: { partnerId, moduleSlug: "billing" },
    select: { data: true },
  });
  let highest: number | undefined;
  for (const record of records) {
    const data = record.data as Record<string, unknown>;
    const number = typeof data.invoiceNumber === "string" ? data.invoiceNumber : "";
    const sequence = invoiceSequenceFromNumber(number, scheme);
    if (sequence !== undefined && (highest === undefined || sequence > highest)) highest = sequence;
  }
  return highest;
}

async function nextCounterValue(
  documentType: string,
  partnerId: string | undefined,
  scheme: NumberingScheme,
  client: Prisma.TransactionClient = prisma,
  reconcileIssuedRecords = false
): Promise<number> {
  const legacyDocumentType = LEGACY_INVOICE_DOCUMENT_TYPE[documentType];
  if (!legacyDocumentType || !partnerId) return scheme.sequenceStart;
  const legacyCounter = await client.numberingCounter.findUnique({
    where: { scopeKey: scopeKey(legacyDocumentType, partnerId) },
    select: { value: true },
  });
  // Counter values store the last issued sequence. A new GST/Non-GST
  // counter must therefore start at the *next* value after its legacy one.
  const legacyNext = (legacyCounter?.value ?? scheme.sequenceStart - 1) + 1;
  if (!reconcileIssuedRecords) return Math.max(scheme.sequenceStart, legacyNext);
  const highestIssued = await highestIssuedInvoiceSequence(partnerId, scheme, client);
  return Math.max(scheme.sequenceStart, legacyNext, (highestIssued ?? scheme.sequenceStart - 1) + 1);
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

/**
 * Partner override if one exists, otherwise the Main scheme, otherwise the
 * built-in default.
 *
 * `defaults` only applies when NOTHING has been configured for the document
 * type (no partner override, no Main scheme) — it lets a caller supply a
 * sensible built-in for its own document type (e.g. a "WO" prefix for
 * Service Centre workorder ids) instead of inheriting DEFAULT_SCHEME's
 * invoice-shaped "INV". Omit it and behaviour is exactly as before.
 */
export async function getEffectiveScheme(
  documentType: string,
  partnerId?: string,
  defaults?: Partial<NumberingScheme>,
  client: Prisma.TransactionClient = prisma
): Promise<NumberingScheme> {
  const effectiveDefaults = defaultsForDocument(documentType, defaults);
  if (partnerId) {
    const override = await client.numberingPartnerScheme.findUnique({ where: { partnerId_documentType: { partnerId, documentType } } });
    if (override?.scheme) return override.scheme as unknown as NumberingScheme;
  }
  const row = await client.numberingMainScheme.findUnique({ where: { documentType } });
  if (row?.scheme) return row.scheme as unknown as NumberingScheme;

  // No new GST/Non-GST configuration yet: inherit the partner's existing
  // B2B/B2C setup until they intentionally configure the new document type.
  const legacyDocumentType = LEGACY_INVOICE_DOCUMENT_TYPE[documentType];
  if (legacyDocumentType) {
    if (partnerId) {
      const legacyOverride = await client.numberingPartnerScheme.findUnique({ where: { partnerId_documentType: { partnerId, documentType: legacyDocumentType } } });
      if (legacyOverride?.scheme) return legacyOverride.scheme as unknown as NumberingScheme;
    }
    const legacyMain = await client.numberingMainScheme.findUnique({ where: { documentType: legacyDocumentType } });
    if (legacyMain?.scheme) return legacyMain.scheme as unknown as NumberingScheme;
  }
  return effectiveDefaults ? { ...DEFAULT_SCHEME, ...effectiveDefaults } : DEFAULT_SCHEME;
}

/** Peek at what the NEXT number would look like without consuming it — for live preview UIs. */
export async function previewNextNumber(documentType: string, partnerId?: string): Promise<string> {
  const scheme = await getEffectiveScheme(documentType, partnerId);
  const key = scopeKey(documentType, partnerId);
  const row = await prisma.numberingCounter.findUnique({ where: { scopeKey: key } });
  const initial = await nextCounterValue(documentType, partnerId, scheme, prisma, !row);
  const current = row?.value ?? initial - 1;
  return formatNumber(scheme, current + 1);
}

/**
 * Real, working counter — advances and persists on every call. This is the
 * "fetch from live numbers" mechanism: two calls in a row return two
 * different, sequential numbers. Uses upsert-with-increment so concurrent
 * calls for the same scope are serialized by Postgres, not by app code.
 */
export async function getNextNumber(
  documentType: string,
  partnerId?: string,
  defaults?: Partial<NumberingScheme>,
  client: Prisma.TransactionClient = prisma
): Promise<string> {
  const scheme = await getEffectiveScheme(documentType, partnerId, defaults, client);
  const key = scopeKey(documentType, partnerId);
  const existingCounter = await client.numberingCounter.findUnique({ where: { scopeKey: key }, select: { value: true } });
  // A short-lived deployment may already have opened the new stream using a
  // stale legacy counter. Reconcile it before issuing the next document so
  // the counter can only move forward to the highest visible invoice serial.
  if (existingCounter && partnerId && LEGACY_INVOICE_DOCUMENT_TYPE[documentType]) {
    const highestIssued = await highestIssuedInvoiceSequence(partnerId, scheme, client);
    if (highestIssued !== undefined && highestIssued > existingCounter.value) {
      await client.numberingCounter.updateMany({
        where: { scopeKey: key, value: { lt: highestIssued } },
        data: { value: highestIssued },
      });
    }
  }
  const initial = await nextCounterValue(documentType, partnerId, scheme, client, !existingCounter);

  const row = await client.numberingCounter.upsert({
    where: { scopeKey: key },
    create: { scopeKey: key, value: initial },
    update: { value: { increment: 1 } },
  });

  return formatNumber(scheme, row.value);
}
