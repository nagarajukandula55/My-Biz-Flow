"use client";

import { useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import type { DropdownOption, FieldSpec, PageCustomization } from "@/lib/designer/customizations";
import {
  addFieldAction,
  deleteFieldAction,
  setDropdownOptionsAction,
  setFieldHiddenAction,
  setFieldLabelAction,
} from "@/lib/designer/actions";
import type { SchemaField } from "@/lib/designer/fieldSchema";

type Props = {
  pageId: string;
  baseFields: SchemaField[];
  customization: PageCustomization;
};

const SELECT_TYPES = ["select", "select-chip", "multi-select", "multi-chip"];
/**
 * Every input type a Super Admin can hand a module — matches
 * RecordForm's FormFieldType, DataTable's ColumnType, and RecordDetail's
 * FieldType (all three widened together, see DESIGN_SYSTEM.md §8): a
 * field added here renders correctly wherever that field shows up, not
 * just in the form it was added from.
 */
const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "currency",
  "percentage",
  "date",
  "time",
  "datetime",
  "select",
  "multi-select",
  "boolean",
  "relation",
  "email",
  "phone",
  "url",
  "password",
  "color",
  "rating",
  "file",
];

export function DesignerFieldEditor({ pageId, baseFields, customization }: Props) {
  const [isPending, startTransition] = useTransition();

  const builtInKeys = new Set(baseFields.map((f) => f.key));
  const rows: Array<SchemaField & { isCustom: boolean }> = [
    ...baseFields.map((f) => ({ ...f, isCustom: false })),
    ...customization.addedFields
      .filter((f) => !customization.deletedFieldKeys.includes(f.key))
      .map((f) => ({ ...f, isCustom: true })),
  ];

  return (
    <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
      <h2 className="font-display text-base font-bold text-text">
        Field / column editor
        {isPending && <span className="ml-2 text-xs font-normal text-text-muted">Saving…</span>}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Edit labels, hide fields, delete custom fields, and manage dropdown options. Changes are
        stored in the database and apply live to this page's list/form/detail rendering across the
        app.
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((field) => {
          const override = customization.fieldOverrides[field.key];
          const hidden = !!override?.hidden;
          return (
            <FieldRow
              key={field.key}
              pageId={pageId}
              field={field}
              isCustom={!builtInKeys.has(field.key)}
              hidden={hidden}
              optionOverride={customization.optionOverrides[field.key]}
              startTransition={startTransition}
            />
          );
        })}
      </div>

      <AddFieldForm pageId={pageId} startTransition={startTransition} />
    </div>
  );
}

function FieldRow({
  pageId,
  field,
  isCustom,
  hidden,
  optionOverride,
  startTransition,
}: {
  pageId: string;
  field: SchemaField;
  isCustom: boolean;
  hidden: boolean;
  optionOverride?: DropdownOption[];
  startTransition: (fn: () => void) => void;
}) {
  const [label, setLabel] = useState(field.label);
  const isSelect = SELECT_TYPES.includes(field.type);
  const [options, setOptions] = useState<DropdownOption[]>(
    optionOverride ?? (field.options ?? []).map((o) => ({ label: o, value: o }))
  );
  const [newOptLabel, setNewOptLabel] = useState("");

  return (
    <div className={`rounded-md border border-border p-3 ${hidden ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-text-muted" title="field key">
          {field.key}
        </span>
        <input
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-teal"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          className="btn-outline px-3 py-1 text-xs"
          onClick={() => startTransition(() => setFieldLabelAction(pageId, field.key, label))}
        >
          Save label
        </button>
        <button
          type="button"
          className="btn-outline px-3 py-1 text-xs"
          onClick={() => startTransition(() => setFieldHiddenAction(pageId, field.key, !hidden))}
        >
          {hidden ? "Show" : "Hide"}
        </button>
        {isCustom ? (
          <ConfirmDeleteDialog
            recordLabel={field.label}
            triggerClassName="btn-danger px-3 py-1 text-xs"
            onConfirm={() => startTransition(() => deleteFieldAction(pageId, field.key, true))}
          />
        ) : (
          <span className="text-xs text-text-muted" title="Built-in fields can only be hidden, not deleted">
            built-in
          </span>
        )}
      </div>

      {isSelect && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Dropdown options
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <li
                key={`${opt.value}-${i}`}
                className="flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-1 text-xs"
              >
                <input
                  className="w-24 bg-transparent outline-none"
                  value={opt.label}
                  onChange={(e) => {
                    const next = options.slice();
                    next[i] = { ...next[i], label: e.target.value, value: e.target.value };
                    setOptions(next);
                  }}
                />
                <button
                  type="button"
                  className="text-danger"
                  aria-label="Remove option"
                  onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-teal"
              placeholder="New option label"
              value={newOptLabel}
              onChange={(e) => setNewOptLabel(e.target.value)}
            />
            <button
              type="button"
              className="btn-outline px-2 py-1 text-xs"
              onClick={() => {
                if (!newOptLabel.trim()) return;
                setOptions([...options, { label: newOptLabel, value: newOptLabel }]);
                setNewOptLabel("");
              }}
            >
              + Add option
            </button>
            <button
              type="button"
              className="btn-accent px-2 py-1 text-xs"
              onClick={() => startTransition(() => setDropdownOptionsAction(pageId, field.key, options))}
            >
              Save options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddFieldForm({
  pageId,
  startTransition,
}: {
  pageId: string;
  startTransition: (fn: () => void) => void;
}) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<string>("text");
  const [required, setRequired] = useState(false);

  function submit() {
    if (!key.trim() || !label.trim()) return;
    const field: FieldSpec = { key: key.trim(), label: label.trim(), type, required };
    startTransition(() => addFieldAction(pageId, field));
    setKey("");
    setLabel("");
    setType("text");
    setRequired(false);
  }

  return (
    <div className="mt-5 rounded-md border border-dashed border-border p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Add a custom field
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          className="w-32 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-teal"
          placeholder="key (e.g. warrantyMonths)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <input
          className="w-40 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-teal"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-teal"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-text-muted">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          required
        </label>
        <button type="button" className="btn-accent px-3 py-1 text-xs" onClick={submit}>
          + Add field
        </button>
      </div>
    </div>
  );
}
