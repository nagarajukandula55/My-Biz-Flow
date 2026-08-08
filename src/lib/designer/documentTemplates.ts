/**
 * Document template store — lets a Super Admin design a record's printable
 * document (Invoice, Job Card, Receipt, etc.) from the Designer, using
 * {{fieldKey}} placeholders instead of a hardcoded layout per module.
 *
 * Same honest JSON-file pattern as customizations.ts and errorLog.ts:
 * atomic writes (temp file + rename), works for local dev, does NOT
 * survive Vercel's read-only/ephemeral runtime filesystem. Migrate to a
 * `DocumentTemplate` Prisma table keyed by pageId, identical function
 * signatures, when the database exists.
 */

import fs from "node:fs";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "data", "document-templates.json");

type Store = Record<string, { htmlTemplate: string }>;

function readStore(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
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

export function getDocumentTemplate(pageId: string): string | undefined {
  return readStore()[pageId]?.htmlTemplate;
}

export function saveDocumentTemplate(pageId: string, htmlTemplate: string): void {
  const store = readStore();
  store[pageId] = { htmlTemplate };
  writeStore(store);
}

/**
 * Simple {{key}} substitution — HTML-escapes every substituted value so a
 * record field containing "<" or "&" can't break the document markup or
 * inject arbitrary HTML. Deliberately not a full templating engine: no
 * loops/conditionals, just placeholder replacement, which is all a
 * mail-merge-style document needs.
 */
export function renderTemplate(htmlTemplate: string, record: Record<string, unknown>): string {
  return htmlTemplate.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = record[key];
    return escapeHtml(value === undefined || value === null ? "" : String(value));
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
