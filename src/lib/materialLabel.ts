/**
 * Every material is stored as one combined "CODE — Description" label (see
 * warehouse.ts's doc comments) — fine for a single-column picker, but wrong
 * for a CSV export: Material Code and Material Name/Description need their
 * own columns so a spreadsheet can actually sort/filter by code. Splits
 * only at export time — the underlying combined-label storage is
 * unchanged, so every existing picker/typeahead keeps working.
 */
export function splitMaterialLabel(materialId: unknown): { code: string; name: string } {
  const raw = String(materialId ?? "");
  const idx = raw.indexOf(" — ");
  if (idx === -1) return { code: raw.trim(), name: "" };
  return { code: raw.slice(0, idx).trim(), name: raw.slice(idx + 3).trim() };
}
