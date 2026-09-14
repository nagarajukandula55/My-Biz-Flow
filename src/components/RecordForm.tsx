"use client";

import { Fragment, useRef, useState, useTransition, type FormEvent } from "react";
import { INDIAN_STATES } from "@/lib/sample-data/geo";
import { lookupPincodeViaApi } from "@/lib/geo/pincodeClient";

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
  /**
   * Stored VALUES for a select/multi-select. Deliberately still a plain
   * string[] so the Designer's option-override merge (applyCustomizations,
   * which types its generic as `options?: string[]`) keeps working
   * unchanged; display text that differs from the stored value goes in
   * `optionLabels` instead of turning this into an object array.
   */
  options?: string[];
  /** value -> human label, for options whose stored code isn't readable ("OOW" -> "Out of Warranty (OOW)"). */
  optionLabels?: Record<string, string>;
  /**
   * value -> <optgroup> heading, for a select whose options span more than
   * one meaningful set — e.g. the workorder's Device Type when a partner
   * deals in both Electronics and Automobiles, where a flat 60-entry list
   * would be unreadable. Groups render in first-appearance order of
   * `options`; any option with no entry here renders ungrouped, before the
   * groups. Kept as a value->heading map (rather than nesting `options`)
   * for the same reason as optionLabels: the Designer's option-override
   * merge types `options` as a plain string[].
   */
  optionGroups?: Record<string, string>;
  placeholder?: string;
  /**
   * Section heading this field belongs under. Fields are rendered in the
   * order given and a heading is emitted whenever the section changes —
   * matching the grouped intake layout (Customer / Address / Device /
   * Issue) rather than one long flat column of inputs.
   */
  section?: string;
  /**
   * Free-text field backed by a `<datalist>` of existing values — type
   * anything, or pick a known one. Used for Brand/Model/"Logged by", where
   * the catalog is a suggestion, not a closed set.
   */
  suggestions?: string[];
  /** Renders a small "+ <label>" link beside the field, to the page that creates a new catalog entry. */
  addNew?: { label: string; href: string };
  /** Helper text rendered under the input. */
  help?: string;
  /**
   * Hide this field on a CREATE render (`<RecordForm mode="create">`), while
   * keeping it on the edit form. For lifecycle/outcome fields that the
   * system or a later stage sets — a workorder's Status, its SLA date, its
   * actual cost — which have no meaning at intake and only pad the form.
   *
   * Additive and opt-in: a field with no `createHidden` renders everywhere,
   * so every other module's form is unchanged.
   */
  createHidden?: boolean;
  /**
   * Which column this field's SECTION belongs in, when the form is rendered
   * with `layout="columns"`. Ignored entirely in the default single-column
   * layout. Set it on every field of a section (they're grouped by section,
   * and the first field's value wins).
   */
  column?: 1 | 2;
  /**
   * Opts this field into the shared pincode -> state/city resolution (the
   * same /api/pincode path the signup form uses, see lib/geo/pincodeClient):
   *  - "pincode": on a complete 6-digit value, resolves and fills the
   *    sibling state/city fields.
   *  - "state": renders as a fixed INDIAN_STATES select, so a stored state
   *    is always a canonical name (the CGST/SGST-vs-IGST split depends on
   *    it) rather than free-typed "karnataka"/"KTK".
   *  - "city": a select of the resolved districts when a lookup succeeded,
   *    free text otherwise.
   */
  addressRole?: "pincode" | "state" | "city";
  /**
   * Makes this field's suggestions depend on another field's current value
   * — Model suggestions scoped to the selected Brand. `parentKey` names the
   * controlling field; `suggestionsByParent` maps that field's value to the
   * suggestion list. Changing the parent clears this field. Purely
   * client-side off a prop; no fetch.
   */
  parentKey?: string;
  suggestionsByParent?: Record<string, string[]>;
};

type RecordFormProps = {
  fields: FormFieldDef[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  onSubmitDemo?: (values: Record<string, unknown>) => void;
  /**
   * Real persistence path — a server action (already bound with whatever
   * scoping it needs, e.g. .bind(null, partnerId, moduleSlug)) that
   * receives the form's values directly. When provided, this replaces
   * the demo-stub submit entirely; onSubmitDemo is ignored.
   */
  action?: (values: Record<string, unknown>) => Promise<void | { error?: string }>;
  /**
   * "create" drops every field marked `createHidden`. Anything else (the
   * default) renders the full field set, so edit pages and every other
   * module are untouched.
   */
  mode?: "create" | "edit";
  /**
   * "columns" renders each section as a bordered card in a 2-column grid,
   * placing a section by its fields' `column`. Default is the original
   * single `max-w-2xl` flowing column — this is opt-in per form.
   */
  layout?: "single" | "columns";
  /**
   * Optional prefill-on-type hook: whenever the field named by `watchKey`
   * changes, `run` (a bound Server Action) is called with its value and
   * any non-empty fields it returns are merged into the form — used by
   * Service Centre intake to prefill a returning customer from their
   * phone number. Fields the user has already typed into are never
   * overwritten. Same client/server split as the signup flow's
   * PincodeLookupFields; no client-side data fetching beyond this.
   */
  lookup?: {
    watchKey: string;
    run: (value: string) => Promise<(Record<string, unknown> & { source?: string }) | null>;
  };
};

/**
 * Config-driven form shared by every module's create/edit page. Renders one
 * input per field definition — never hand-roll a bespoke form per module,
 * see DESIGN_SYSTEM.md §8 (RecordForm convention).
 *
 * Pass `action` for real persistence (a bound server action); omit it and
 * submission falls back to the original client-side demo stub (logs the
 * values, shows "Saved (demo)") for anything not yet migrated.
 */
export function RecordForm({ fields: allFields, initialValues, submitLabel, onSubmitDemo, action, lookup, mode, layout }: RecordFormProps) {
  // A create render drops lifecycle/outcome fields; every other render (and
  // every field with no flag) is unchanged.
  const fields = mode === "create" ? allFields.filter((f) => !f.createHidden) : allFields;
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
  const [pending, startTransition] = useTransition();

  const [lookupHint, setLookupHint] = useState<string | null>(null);
  // Guards against re-running the same lookup on every keystroke that
  // leaves the watched value unchanged (e.g. formatting characters).
  const lastLookedUp = useRef<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  // Districts returned by the last successful pincode lookup, for the
  // sibling "city" field. Empty until one succeeds -> City stays free text.
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  const pincodeKey = fields.find((f) => f.addressRole === "pincode")?.key;
  const stateKey = fields.find((f) => f.addressRole === "state")?.key;
  const cityKey = fields.find((f) => f.addressRole === "city")?.key;

  function setValue(key: string, value: unknown) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Changing a controlling field (Brand) invalidates whatever was
      // picked under the old one (Model).
      for (const f of fields) {
        if (f.parentKey === key && next[f.key]) next[f.key] = "";
      }
      return next;
    });
    setSaved(false);
    setFormError(null);
    if (lookup && key === lookup.watchKey) runLookup(String(value ?? ""));
    if (pincodeKey && key === pincodeKey) runPincode(String(value ?? ""));
  }

  function runPincode(raw: string) {
    const code = raw.replace(/\D/g, "");
    if (code.length !== 6) {
      setCityOptions([]);
      return;
    }
    void lookupPincodeViaApi(code).then((res) => {
      if (!res.found || !res.state) {
        // Manual fallback: State is a fixed select regardless, City free text.
        setCityOptions([]);
        return;
      }
      setCityOptions(res.cities ?? []);
      setValues((prev) => {
        const next = { ...prev };
        if (stateKey) next[stateKey] = res.state as string;
        if (cityKey && !String(prev[cityKey] ?? "").trim()) next[cityKey] = res.cities?.[0] ?? "";
        return next;
      });
    });
  }

  function runLookup(raw: string) {
    if (!lookup) return;
    if (raw === lastLookedUp.current) return;
    lastLookedUp.current = raw;
    setLookupHint(null);
    void lookup
      .run(raw)
      .then((match) => {
        if (!match || lastLookedUp.current !== raw) return;
        const { source, ...prefill } = match;
        setValues((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(prefill)) {
            // Never clobber what the user already typed, and never write
            // an empty value over a filled one.
            if (v === undefined || v === null || v === "") continue;
            if (next[k] !== undefined && next[k] !== "") continue;
            next[k] = v;
          }
          return next;
        });
        setLookupHint(source ? `Existing customer found (${source}) — details prefilled.` : "Existing record found — details prefilled.");
      })
      .catch(() => {
        // Best-effort: a failed lookup must never block manual entry.
      });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (action) {
      setFormError(null);
      startTransition(async () => {
        // A successful action redirects and never returns; a rejected one
        // hands back `{ error }` for display above the submit button.
        const result = await action(values);
        if (result && typeof result === "object" && result.error) setFormError(result.error);
      });
      return;
    }
    // eslint-disable-next-line no-console
    console.log("RecordForm submit (demo, no backend):", values);
    onSubmitDemo?.(values);
    setSaved(true);
  }

  const renderField = (field: FormFieldDef) => (
    <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
      <label
        htmlFor={field.key}
        className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted"
      >
        <span>
          {field.label}
          {field.required && <span className="ml-1 text-danger">*</span>}
        </span>
        {field.addNew && (
          <a
            href={field.addNew.href}
            target="_blank"
            rel="noreferrer"
            className="font-semibold normal-case tracking-normal text-teal hover:underline"
          >
            + {field.addNew.label}
          </a>
        )}
      </label>
      {renderInput(field, values[field.key], setValue, {
        parentValue: field.parentKey ? String(values[field.parentKey] ?? "") : undefined,
        cityOptions,
      })}
      {field.help && <p className="mt-1 text-[11px] font-normal normal-case text-text-muted">{field.help}</p>}
      {lookupHint && lookup?.watchKey === field.key && (
        <p className="mt-1 text-[11px] font-normal normal-case text-teal">{lookupHint}</p>
      )}
    </div>
  );

  const footer = (
    <>
      {formError && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {formError}
        </p>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-accent" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {saved && !action && (
          <span className="text-sm font-semibold text-success">Saved (demo — no backend yet)</span>
        )}
      </div>
    </>
  );

  if (layout === "columns") {
    // Sections, in the order they first appear, split across two columns by
    // their declared `column` — matching the reference intake screen's
    // Customer+Address / Device+Issue arrangement.
    const sections: { name: string; column: 1 | 2; fields: FormFieldDef[] }[] = [];
    for (const field of fields) {
      const name = field.section ?? "";
      const last = sections[sections.length - 1];
      if (last && last.name === name) last.fields.push(field);
      else sections.push({ name, column: field.column ?? 1, fields: [field] });
    }
    const columnOf = (n: 1 | 2) => sections.filter((s) => s.column === n);
    const renderColumn = (n: 1 | 2) => (
      <div className="space-y-4">
        {columnOf(n).map((s) => (
          <div key={s.name} className="rounded-md border border-border bg-bg-raised p-4">
            {s.name && <h2 className="mb-3 font-display text-sm font-bold text-text">{s.name}</h2>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{s.fields.map(renderField)}</div>
          </div>
        ))}
      </div>
    );
    return (
      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {renderColumn(1)}
          {renderColumn(2)}
        </div>
        {footer}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field, i) => {
          const prevSection = i === 0 ? undefined : fields[i - 1].section;
          const showSection = Boolean(field.section) && field.section !== prevSection;
          return (
            <Fragment key={field.key}>
              {showSection && (
                <h2 className="mt-2 border-b border-border pb-1.5 font-display text-sm font-bold text-text sm:col-span-2">
                  {field.section}
                </h2>
              )}
              {renderField(field)}
            </Fragment>
          );
        })}
      </div>
      {footer}
    </form>
  );
}

function renderInput(
  field: FormFieldDef,
  value: unknown,
  setValue: (key: string, value: unknown) => void,
  ctx: { parentValue?: string; cityOptions: string[] } = { cityOptions: [] }
) {
  const baseClass =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal";

  // --- Address roles: one canonical state value, city from the resolved
  // districts when the pincode lookup found any. Same behaviour and same
  // fallbacks as the signup form's PincodeLookupFields.
  if (field.addressRole === "state") {
    return (
      <select
        id={field.key}
        className={baseClass}
        value={String(value ?? "")}
        required={field.required}
        onChange={(e) => setValue(field.key, e.target.value)}
      >
        <option value="">Select state</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    );
  }
  if (field.addressRole === "city" && ctx.cityOptions.length > 0) {
    return (
      <select
        id={field.key}
        className={baseClass}
        value={String(value ?? "")}
        required={field.required}
        onChange={(e) => setValue(field.key, e.target.value)}
      >
        <option value="">Select city</option>
        {ctx.cityOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

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
    case "select": {
      const opts = field.options ?? [];
      const groups = field.optionGroups;
      // Ungrouped options first, then each group in the order its first
      // member appears in `options`.
      const ungrouped = groups ? opts.filter((o) => !groups[o]) : opts;
      const groupOrder: string[] = [];
      if (groups) {
        for (const o of opts) {
          const g = groups[o];
          if (g && !groupOrder.includes(g)) groupOrder.push(g);
        }
      }
      const renderOption = (opt: string) => (
        <option key={opt} value={opt}>
          {field.optionLabels?.[opt] ?? opt}
        </option>
      );
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
          {ungrouped.map(renderOption)}
          {groupOrder.map((g) => (
            <optgroup key={g} label={g}>
              {opts.filter((o) => groups?.[o] === g).map(renderOption)}
            </optgroup>
          ))}
        </select>
      );
    }
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
    default: {
      // A `suggestions` list makes this a combobox: the existing catalog
      // entries are offered, but anything can still be typed — a device
      // brand/model that isn't in the catalog yet must never block intake.
      // When the field is scoped to a parent (Model under Brand), only the
      // entries under the CURRENT parent value are offered — filtered
      // in-browser from a map passed down as a prop, no fetch.
      const suggestions = field.suggestionsByParent
        ? (ctx.parentValue ? field.suggestionsByParent[ctx.parentValue] ?? [] : [])
        : field.suggestions;
      const listId = suggestions?.length ? `${field.key}-suggestions` : undefined;
      return (
        <>
          <input
            id={field.key}
            type="text"
            list={listId}
            className={baseClass}
            value={String(value ?? "")}
            placeholder={
              field.suggestionsByParent && !ctx.parentValue
                ? "Pick a brand first"
                : field.placeholder
            }
            required={field.required}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
          {listId && (
            <datalist id={listId}>
              {suggestions?.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      );
    }
  }
}
