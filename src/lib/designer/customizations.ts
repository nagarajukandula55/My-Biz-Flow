/**
 * The Designer's live-editing store.
 *
 * IMPORTANT / KNOWN TRADEOFF: there is no database wired up yet (Prisma +
 * Postgres are explicitly "not yet wired up" per CLAUDE.md), so this is a
 * JSON-file-backed store — `data/customizations.json` at the repo root —
 * used as an honest, clearly-flagged stand-in for real persistence.
 *
 * This works for local dev (Next.js Server Actions run on a long-lived
 * Node process, so `fs.writeFileSync` here really does persist across
 * requests on your machine). It does NOT survive a Vercel deploy the way a
 * database would:
 *   - Vercel's filesystem is read-only at runtime outside of `/tmp`, and
 *     even `/tmp` is ephemeral per-invocation/per-cold-start.
 *   - Serverless functions do not share a filesystem across instances, so
 *     a write from one invocation is not guaranteed to be visible to the
 *     next request at all, let alone durably.
 *   - On Vercel this store should be treated as effectively read-only,
 *     seeded from the committed `data/customizations.json` starter file.
 * When Prisma/Postgres is wired up, this whole module should be replaced
 * by a `PageCustomization` table keyed by `pageId`, with the exact same
 * function signatures below so callers (Server Actions, components) don't
 * need to change.
 */

import fs from "node:fs";
import path from "node:path";

export type FieldOverride = {
  label?: string;
  hidden?: boolean;
};

export type DropdownOption = {
  label: string;
  value: string;
};

/** Same shape as the module's own field/column definitions, kept loose so
 * it can be rendered by DataTable (Column), RecordForm (FormFieldDef), or
 * RecordDetail (RecordField) — the Designer only needs key/label/type/
 * required/options, and each consumer narrows as it merges. */
export type FieldSpec = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export type PageCustomization = {
  fieldOverrides: Record<string, FieldOverride>;
  addedFields: FieldSpec[];
  deletedFieldKeys: string[];
  optionOverrides: Record<string, DropdownOption[]>;
};

type Store = Record<string, PageCustomization>;

const DATA_FILE = path.join(process.cwd(), "data", "customizations.json");

const EMPTY: PageCustomization = {
  fieldOverrides: {},
  addedFields: [],
  deletedFieldKeys: [],
  optionOverrides: {},
};

function readStore(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    // Missing/unreadable/corrupt file — fall back to an empty store rather
    // than throwing, so a fresh checkout or a read-only deploy never 500s.
    return {};
  }
}

function writeStore(store: Store) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    // Atomic write: write to a temp file in the same directory, then
    // rename over the real file. A plain writeFileSync to the final path
    // is not atomic — a concurrent read (or a crash mid-write) can observe
    // a truncated/partial JSON file. rename() on the same filesystem is
    // atomic on POSIX, so readers only ever see the old complete file or
    // the new complete file, never a half-written one.
    const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2) + "\n", "utf-8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch {
    // Read-only filesystem (e.g. Vercel serverless at runtime) — this is
    // the explicitly-documented tradeoff above. Swallow rather than crash
    // the request; the edit simply won't persist in that environment.
  }
}

export function getPageCustomization(pageId: string): PageCustomization {
  const store = readStore();
  const existing = store[pageId];
  if (!existing) return { ...EMPTY, fieldOverrides: {}, addedFields: [], deletedFieldKeys: [], optionOverrides: {} };
  return {
    fieldOverrides: existing.fieldOverrides ?? {},
    addedFields: existing.addedFields ?? [],
    deletedFieldKeys: existing.deletedFieldKeys ?? [],
    optionOverrides: existing.optionOverrides ?? {},
  };
}

/**
 * Read-modify-write, not locked — two concurrent edits to the SAME pageId
 * can still race and one can clobber the other (last-write-wins), even
 * though each individual write is now atomic (no half-written file). Real
 * locking is overkill for a stopgap file store; this is an accepted gap,
 * not an oversight — it goes away entirely once this moves to a database
 * transaction.
 */
function updatePage(pageId: string, mutate: (c: PageCustomization) => void) {
  const store = readStore();
  const current = store[pageId] ?? { fieldOverrides: {}, addedFields: [], deletedFieldKeys: [], optionOverrides: {} };
  mutate(current);
  store[pageId] = current;
  writeStore(store);
}

export function setFieldLabel(pageId: string, fieldKey: string, label: string) {
  updatePage(pageId, (c) => {
    c.fieldOverrides[fieldKey] = { ...c.fieldOverrides[fieldKey], label };
  });
}

export function setFieldHidden(pageId: string, fieldKey: string, hidden: boolean) {
  updatePage(pageId, (c) => {
    c.fieldOverrides[fieldKey] = { ...c.fieldOverrides[fieldKey], hidden };
  });
}

export function addField(pageId: string, field: FieldSpec) {
  updatePage(pageId, (c) => {
    c.addedFields = c.addedFields.filter((f) => f.key !== field.key);
    c.addedFields.push(field);
    c.deletedFieldKeys = c.deletedFieldKeys.filter((k) => k !== field.key);
  });
}

/**
 * Deleting a BUILT-IN field (one that ships with the module's base schema)
 * is only ever a hide — we never let the Super Admin corrupt the base
 * schema, only override/hide it. Deleting a custom `addedFields` entry is
 * a true removal. This function does both depending on which list the key
 * is found in.
 */
export function deleteField(pageId: string, fieldKey: string, isCustomField: boolean) {
  if (isCustomField) {
    updatePage(pageId, (c) => {
      c.addedFields = c.addedFields.filter((f) => f.key !== fieldKey);
      if (!c.deletedFieldKeys.includes(fieldKey)) c.deletedFieldKeys.push(fieldKey);
    });
  } else {
    setFieldHidden(pageId, fieldKey, true);
  }
}

export function setDropdownOptions(pageId: string, fieldKey: string, options: DropdownOption[]) {
  updatePage(pageId, (c) => {
    c.optionOverrides[fieldKey] = options;
  });
}

/**
 * The one shared merge helper DataTable/RecordForm/RecordDetail pages all
 * consume before rendering — this is what makes overrides "real" rather
 * than cosmetic. Works generically over any base field/column array that
 * has at least { key, label }; options (when present) are overridden too,
 * for select-type fields.
 */
export function applyCustomizations<T extends { key: string; label: string; options?: string[] }>(
  pageId: string,
  baseFields: T[]
): T[] {
  const c = getPageCustomization(pageId);

  const merged = baseFields
    .filter((f) => !c.fieldOverrides[f.key]?.hidden)
    .map((f) => {
      const override = c.fieldOverrides[f.key];
      const optionOverride = c.optionOverrides[f.key];
      if (!override && !optionOverride) return f;
      return {
        ...f,
        ...(override?.label ? { label: override.label } : {}),
        ...(optionOverride ? { options: optionOverride.map((o) => o.value) } : {}),
      };
    });

  const added = c.addedFields
    .filter((f) => !c.deletedFieldKeys.includes(f.key))
    .map((f) => ({ ...f } as unknown as T));

  return [...merged, ...added];
}

/**
 * RecordDetail's field grid (`RecordField[]`) has no `key` — it's built
 * straight from label/value pairs — so this variant matches overrides by
 * looking up each field's key via its module's column definitions (which
 * share the same label text 1:1, by construction — see each module's
 * getXDetailFields()). Custom `addedFields` are appended with a placeholder
 * "—" value since detail views have no live record data source for them.
 */
export function applyCustomizationsToDetailFields<F extends { label: string }>(
  pageId: string,
  baseFields: F[],
  columns: { key: string; label: string }[]
): F[] {
  const c = getPageCustomization(pageId);
  const labelToKey = new Map(columns.map((col) => [col.label, col.key]));

  const merged = baseFields
    .filter((f) => {
      const key = labelToKey.get(f.label);
      return !(key && c.fieldOverrides[key]?.hidden);
    })
    .map((f) => {
      const key = labelToKey.get(f.label);
      const override = key ? c.fieldOverrides[key] : undefined;
      if (!override?.label) return f;
      return { ...f, label: override.label };
    });

  const added = c.addedFields
    .filter((f) => !c.deletedFieldKeys.includes(f.key))
    .map((f) => ({ label: f.label, value: "—", type: "text" } as unknown as F));

  return [...merged, ...added];
}
