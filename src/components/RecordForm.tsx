"use client";

import { useState, type FormEvent } from "react";

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "currency"
  | "boolean"
  | "textarea"
  | "relation"
  | "multi-select"
  | "email"
  | "phone"
  | "url"
  | "password"
  | "time"
  | "datetime"
  | "percentage"
  | "color"
  | "rating"
  | "file";

export type FormFieldDef = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type RecordFormProps = {
  fields: FormFieldDef[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  onSubmitDemo?: (values: Record<string, unknown>) => void;
};

/**
 * Config-driven form shared by every module's create/edit page. Renders one
 * input per field definition — never hand-roll a bespoke form per module,
 * see DESIGN_SYSTEM.md §8 (RecordForm convention).
 *
 * There is no backend/database wired up in this pass, so submission is a
 * client-side stub: it logs the values and shows a "Saved (demo)" message.
 */
export function RecordForm({ fields, initialValues, submitLabel, onSubmitDemo }: RecordFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of fields) {
      base[f.key] =
        initialValues?.[f.key] ??
        (f.type === "boolean" ? false : f.type === "multi-select" ? [] : "");
    }
    return base;
  });
  const [saved, setSaved] = useState(false);

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log("RecordForm submit (demo, no backend):", values);
    onSubmitDemo?.(values);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "textarea" ? "sm:col-span-2" : ""}
          >
            <label
              htmlFor={field.key}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted"
            >
              {field.label}
              {field.required && <span className="ml-1 text-danger">*</span>}
            </label>
            {renderInput(field, values[field.key], setValue)}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-accent">
          {submitLabel}
        </button>
        {saved && (
          <span className="text-sm font-semibold text-success">
            Saved (demo — no backend yet)
          </span>
        )}
      </div>
    </form>
  );
}

function renderInput(
  field: FormFieldDef,
  value: unknown,
  setValue: (key: string, value: unknown) => void
) {
  const baseClass =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal";

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          id={field.key}
          className={`${baseClass} min-h-24`}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 pt-2 text-sm text-text">
          <input
            id={field.key}
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-current text-teal"
            checked={Boolean(value)}
            onChange={(e) => setValue(field.key, e.target.checked)}
          />
          {value ? "Yes" : "No"}
        </label>
      );
    case "select":
      return (
        <select
          id={field.key}
          className={baseClass}
          value={String(value ?? "")}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        >
          <option value="" disabled>
            Select {field.label.toLowerCase()}
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "multi-select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-md border border-border bg-bg p-3">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-current text-teal"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((v) => v !== opt);
                  setValue(field.key, next);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "number":
    case "currency":
      return (
        <input
          id={field.key}
          type="number"
          className={`${baseClass} font-mono tabular-nums`}
          value={value === "" || value === undefined ? "" : String(value)}
          placeholder={field.placeholder ?? (field.type === "currency" ? "0" : undefined)}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          id={field.key}
          type="date"
          className={`${baseClass} font-mono`}
          value={String(value ?? "")}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "time":
      return (
        <input
          id={field.key}
          type="time"
          className={`${baseClass} font-mono`}
          value={String(value ?? "")}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "datetime":
      return (
        <input
          id={field.key}
          type="datetime-local"
          className={`${baseClass} font-mono`}
          value={String(value ?? "")}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "email":
      return (
        <input
          id={field.key}
          type="email"
          className={baseClass}
          value={String(value ?? "")}
          placeholder={field.placeholder ?? "name@example.com"}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "phone":
      return (
        <input
          id={field.key}
          type="tel"
          className={`${baseClass} font-mono`}
          value={String(value ?? "")}
          placeholder={field.placeholder ?? "+91 98765 43210"}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "url":
      return (
        <input
          id={field.key}
          type="url"
          className={baseClass}
          value={String(value ?? "")}
          placeholder={field.placeholder ?? "https://"}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "password":
      return (
        <input
          id={field.key}
          type="password"
          className={baseClass}
          value={String(value ?? "")}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
    case "percentage":
      return (
        <div className="relative">
          <input
            id={field.key}
            type="number"
            min={0}
            max={100}
            className={`${baseClass} pr-8 font-mono tabular-nums`}
            value={value === "" || value === undefined ? "" : String(value)}
            required={field.required}
            onChange={(e) => setValue(field.key, e.target.value === "" ? "" : Number(e.target.value))}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
            %
          </span>
        </div>
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            id={field.key}
            type="color"
            className="h-9 w-12 cursor-pointer rounded-md border border-border bg-bg p-1"
            value={String(value || "#000000")}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
          <span className="font-mono text-sm text-text-muted">{String(value || "#000000")}</span>
        </div>
      );
    case "rating": {
      const current = Number(value) || 0;
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue(field.key, n)}
              className={`text-xl leading-none ${n <= current ? "text-accent" : "text-border"}`}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              ★
            </button>
          ))}
        </div>
      );
    }
    case "file":
      return (
        <div>
          <input
            id={field.key}
            type="file"
            className={`${baseClass} cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-bg-sunken file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text`}
            onChange={(e) => setValue(field.key, e.target.files?.[0]?.name ?? "")}
          />
          <p className="mt-1 text-xs text-text-muted">
            Demo only — no file storage wired up yet, the filename is kept for display.
          </p>
        </div>
      );
    case "relation":
    case "text":
    default:
      return (
        <input
          id={field.key}
          type="text"
          className={baseClass}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );
  }
}
