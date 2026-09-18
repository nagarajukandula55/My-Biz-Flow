/**
 * Shared CSV bulk-import engine, extracted from the original one-off
 * implementations (BOM's bulkImportBomAction, Telecalling's
 * importLeadsAction/parseLeadsCsv) so every module that wants "Upload CSV"
 * writes a 10-line wrapper action instead of re-implementing the parser
 * and per-row error collection each time. Same header-matched, no-quoted-
 * comma parser as those originals — good enough for a plain exported
 * catalog/list, not a full RFC 4180 parser.
 *
 * NOT a "use server" file itself — each module's own actions.ts (already
 * "use server") imports and calls runBulkImport() from inside its own
 * exported Server Action, which is what the client actually binds to.
 */
import { createBusinessRecord } from "@/lib/businessRecords";
import type { FormFieldDef } from "@/components/RecordForm";

export type BulkImportResult = { count: number; failed: { row: number; error: string }[] };

export function parseGenericCsv(text: string, allKeys: string[]): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const knownHeaderIdx: Record<string, number> = {};
  for (const key of allKeys) {
    const idx = header.findIndex((h) => h.toLowerCase() === key.toLowerCase());
    if (idx >= 0) knownHeaderIdx[key] = idx;
  }
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    for (const [key, idx] of Object.entries(knownHeaderIdx)) {
      row[key] = cols[idx] ?? "";
    }
    return row;
  });
}

/**
 * Runs a bulk import against `createBusinessRecord` directly (not the
 * generic createBusinessRecordAction wrapper — no module needing this
 * engine so far has that action's special-cased billing/invoice-numbering
 * side effects to worry about). `formFields` should already exclude any
 * auto-generated "id"-style field the module doesn't want a CSV column
 * for; `transform` is an optional per-row hook (e.g. coercing a "true"/
 * "false" string column to a real boolean) applied after required-field
 * validation.
 */
export async function runBulkImport(
  partnerId: string,
  moduleSlug: string,
  file: File,
  formFields: FormFieldDef[],
  transform?: (values: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>
): Promise<BulkImportResult> {
  const allKeys = formFields.map((f) => f.key);
  const requiredKeys = formFields.filter((f) => f.required).map((f) => f.key);

  const text = await file.text();
  const rows = parseGenericCsv(text, allKeys);
  if (rows.length === 0) throw new Error("No valid rows found in the CSV");

  let count = 0;
  const failed: { row: number; error: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const missing = requiredKeys.filter((key) => !row[key]?.trim());
    if (missing.length > 0) {
      failed.push({ row: i + 2, error: `Missing required field(s): ${missing.join(", ")}` });
      continue;
    }
    try {
      let values: Record<string, unknown> = {};
      for (const key of allKeys) {
        if (row[key] !== undefined && row[key] !== "") values[key] = row[key];
      }
      if (transform) values = await transform(values);
      await createBusinessRecord(partnerId, moduleSlug, values);
      count++;
    } catch (e) {
      failed.push({ row: i + 2, error: e instanceof Error ? e.message : "Failed to create record" });
    }
  }

  return { count, failed };
}
