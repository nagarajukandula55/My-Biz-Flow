"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { bomFormFields } from "@/lib/sample-data/bom";

// "id" (Material Code) is excluded from the CSV vocabulary — it's an
// auto-generated field (see NUMBERED_MODULE_SLUGS in businessRecords.ts)
// when left blank, same as every other system/computed field never asked
// of a CSV upload (mirrors Telecalling's CSV, which lists only real
// user-entered columns).
const CSV_FORM_FIELDS = bomFormFields.filter((f) => f.key !== "id");
const REQUIRED_KEYS = CSV_FORM_FIELDS.filter((f) => f.required).map((f) => f.key);
const ALL_KEYS = CSV_FORM_FIELDS.map((f) => f.key);

/** Same header-matched, no-quoted-comma CSV parser as telecalling's importLeadsAction
 * (see src/lib/telecalling/actions.ts, parseLeadsCsv) — good enough for a plain
 * exported catalog, not a full RFC 4180 parser. */
function parseBomCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const knownHeaderIdx: Record<string, number> = {};
  for (const key of ALL_KEYS) {
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

export async function bulkImportBomAction(
  partnerId: string,
  formData: FormData
): Promise<{ count: number; failed: { row: number; error: string }[] }> {
  await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const text = await file.text();
  const rows = parseBomCsv(text);
  if (rows.length === 0) throw new Error("No valid rows found in the CSV");

  let count = 0;
  const failed: { row: number; error: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const missing = REQUIRED_KEYS.filter((key) => !row[key]?.trim());
    if (missing.length > 0) {
      failed.push({ row: i + 2, error: `Missing required field(s): ${missing.join(", ")}` });
      continue;
    }
    try {
      const values: Record<string, unknown> = {};
      for (const key of ALL_KEYS) {
        if (row[key] !== undefined && row[key] !== "") values[key] = row[key];
      }
      if (values["serialized"] !== undefined) {
        values["serialized"] = String(values["serialized"]).trim().toLowerCase() === "true";
      }
      await createBusinessRecord(partnerId, "inventory-bom", values);
      count++;
    } catch (e) {
      failed.push({ row: i + 2, error: e instanceof Error ? e.message : "Failed to create record" });
    }
  }

  revalidatePath(`/partner/${partnerId}/inventory/bom`);
  return { count, failed };
}
