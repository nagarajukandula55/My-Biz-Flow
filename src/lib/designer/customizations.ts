/**
 * The Designer's live-editing store — backed by the `PageCustomization`
 * Prisma table (see prisma/schema.prisma). Was a JSON-file store; migrated
 * to Postgres with the same function names/behavior, now async to match
 * Prisma's I/O.
 */

import { prisma } from "@/lib/prisma";

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

const EMPTY: PageCustomization = {
  fieldOverrides: {},
  addedFields: [],
  deletedFieldKeys: [],
  optionOverrides: {},
};

export async function getPageCustomization(pageId: string): Promise<PageCustomization> {
  const row = await prisma.pageCustomization.findUnique({ where: { pageId } });
  if (!row) return { ...EMPTY };
  return {
    fieldOverrides: (row.fieldOverrides as Record<string, FieldOverride>) ?? {},
    addedFields: (row.addedFields as FieldSpec[]) ?? [],
    deletedFieldKeys: (row.deletedFieldKeys as string[]) ?? [],
    optionOverrides: (row.optionOverrides as Record<string, DropdownOption[]>) ?? {},
  };
}

/**
 * Read-modify-write inside a single Prisma call isn't possible for JSON
 * columns, so this reads then upserts — two concurrent edits to the SAME
 * pageId can still race (last-write-wins), same accepted gap the old
 * file-store had. Real conflict resolution is overkill for a Designer
 * live-editing store.
 */
async function updatePage(pageId: string, mutate: (c: PageCustomization) => void): Promise<void> {
  const current = await getPageCustomization(pageId);
  mutate(current);
  await prisma.pageCustomization.upsert({
    where: { pageId },
    create: { pageId, ...current },
    update: { ...current },
  });
}

export async function setFieldLabel(pageId: string, fieldKey: string, label: string): Promise<void> {
  await updatePage(pageId, (c) => {
    c.fieldOverrides[fieldKey] = { ...c.fieldOverrides[fieldKey], label };
  });
}

export async function setFieldHidden(pageId: string, fieldKey: string, hidden: boolean): Promise<void> {
  await updatePage(pageId, (c) => {
    c.fieldOverrides[fieldKey] = { ...c.fieldOverrides[fieldKey], hidden };
  });
}

export async function addField(pageId: string, field: FieldSpec): Promise<void> {
  await updatePage(pageId, (c) => {
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
export async function deleteField(pageId: string, fieldKey: string, isCustomField: boolean): Promise<void> {
  if (isCustomField) {
    await updatePage(pageId, (c) => {
      c.addedFields = c.addedFields.filter((f) => f.key !== fieldKey);
      if (!c.deletedFieldKeys.includes(fieldKey)) c.deletedFieldKeys.push(fieldKey);
    });
  } else {
    await setFieldHidden(pageId, fieldKey, true);
  }
}

export async function setDropdownOptions(pageId: string, fieldKey: string, options: DropdownOption[]): Promise<void> {
  await updatePage(pageId, (c) => {
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
export async function applyCustomizations<T extends { key: string; label: string; options?: string[] }>(
  pageId: string,
  baseFields: T[]
): Promise<T[]> {
  const c = await getPageCustomization(pageId);

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
export async function applyCustomizationsToDetailFields<F extends { label: string }>(
  pageId: string,
  baseFields: F[],
  columns: { key: string; label: string }[]
): Promise<F[]> {
  const c = await getPageCustomization(pageId);
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
