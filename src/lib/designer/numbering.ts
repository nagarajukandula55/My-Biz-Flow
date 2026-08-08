/**
 * Document numbering system — two tiers:
 *   - "Main": the Super Admin's own default scheme per document type,
 *     applied to any Vendor that hasn't set its own override.
 *   - "Vendor": a per-Vendor override for the same document type.
 * Same honest JSON-file-store pattern as customizations.ts/errorLog.ts/
 * documentTemplates.ts: atomic writes, works for local dev, does NOT
 * survive Vercel's runtime filesystem — migrate to a `NumberingScheme` +
 * `NumberingCounter` Prisma table pair, same function signatures, once a
 * database exists.
 *
 * "Live numbers": getNextNumber() is a REAL working counter — every call
 * reads the current stored sequence for that scope+document, increments
 * it, persists the new value, and returns the formatted number. It is not
 * a static mock; calling it twice returns two different numbers.
 *
 * Pure formatting logic (types, formatNumber, getFinancialYear) lives in
 * numberingFormat.ts, not here — see that file's header for why (a Client
 * Component needs it without pulling in node:fs/node:path).
 */

import fs from "node:fs";
import path from "node:path";
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

type Store = {
  main: Record<string, NumberingScheme>;
  vendor: Record<string, Record<string, NumberingScheme>>; // vendorId -> documentType -> scheme
  counters: Record<string, number>; // scopeKey -> last-issued sequence number
};

const DATA_FILE = path.join(process.cwd(), "data", "numbering.json");

function readStore(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      main: parsed.main ?? {},
      vendor: parsed.vendor ?? {},
      counters: parsed.counters ?? {},
    };
  } catch {
    return { main: {}, vendor: {}, counters: {} };
  }
}

function writeStore(store: Store) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2) + "\n", "utf-8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch {
    // Read-only filesystem (Vercel runtime) — documented tradeoff above.
  }
}

function scopeKey(documentType: string, vendorId?: string): string {
  return vendorId ? `vendor:${vendorId}:${documentType}` : `main:${documentType}`;
}

export function getMainScheme(documentType: string): NumberingScheme {
  return readStore().main[documentType] ?? DEFAULT_SCHEME;
}

export function saveMainScheme(documentType: string, scheme: NumberingScheme): void {
  const store = readStore();
  store.main[documentType] = scheme;
  writeStore(store);
}

export function getVendorScheme(vendorId: string, documentType: string): NumberingScheme | undefined {
  return readStore().vendor[vendorId]?.[documentType];
}

export function saveVendorScheme(vendorId: string, documentType: string, scheme: NumberingScheme): void {
  const store = readStore();
  if (!store.vendor[vendorId]) store.vendor[vendorId] = {};
  store.vendor[vendorId][documentType] = scheme;
  writeStore(store);
}

export function clearVendorScheme(vendorId: string, documentType: string): void {
  const store = readStore();
  if (store.vendor[vendorId]) delete store.vendor[vendorId][documentType];
  writeStore(store);
}

/** Vendor override if one exists, otherwise the Main scheme, otherwise the built-in default. */
export function getEffectiveScheme(documentType: string, vendorId?: string): NumberingScheme {
  if (vendorId) {
    const override = getVendorScheme(vendorId, documentType);
    if (override) return override;
  }
  return getMainScheme(documentType);
}

/** Peek at what the NEXT number would look like without consuming it — for live preview UIs. */
export function previewNextNumber(documentType: string, vendorId?: string): string {
  const scheme = getEffectiveScheme(documentType, vendorId);
  const key = scopeKey(documentType, vendorId);
  const current = readStore().counters[key] ?? scheme.sequenceStart - 1;
  return formatNumber(scheme, current + 1);
}

/**
 * Real, working counter — advances and persists on every call. This is the
 * "fetch from live numbers" mechanism: two calls in a row return two
 * different, sequential numbers.
 */
export function getNextNumber(documentType: string, vendorId?: string): string {
  const scheme = getEffectiveScheme(documentType, vendorId);
  const key = scopeKey(documentType, vendorId);
  const store = readStore();
  const current = store.counters[key] ?? scheme.sequenceStart - 1;
  const next = current + 1;
  store.counters[key] = next;
  writeStore(store);
  return formatNumber(scheme, next);
}
