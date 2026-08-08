"use client";

import { useMemo, useState, useTransition } from "react";
import type { NumberingScheme, Separator, FinancialYearFormat } from "@/lib/designer/numberingFormat";
import { formatNumber } from "@/lib/designer/numberingFormat";
import {
  saveMainSchemeAction,
  saveVendorSchemeAction,
  clearVendorSchemeAction,
  fetchNextNumberAction,
} from "@/app/admin/numbering/actions";

const SEPARATOR_OPTIONS: { value: Separator; label: string }[] = [
  { value: "-", label: "Hyphen ( - )" },
  { value: "/", label: "Slash ( / )" },
  { value: ".", label: "Dot ( . )" },
  { value: "none", label: "None (no separator)" },
];

const FY_OPTIONS: { value: FinancialYearFormat; label: string; example: string }[] = [
  { value: "none", label: "None", example: "" },
  { value: "YY-YY", label: "YY-YY", example: "24-25" },
  { value: "YYYY-YY", label: "YYYY-YY", example: "2024-25" },
  { value: "YYYYYY", label: "YYYYYY (compact)", example: "2425" },
];

export function NumberingSchemeEditor({
  documentType,
  documentTypeLabel,
  initialScheme,
  vendorId,
  isVendorOverride,
}: {
  documentType: string;
  documentTypeLabel: string;
  initialScheme: NumberingScheme;
  /** Present -> this editor is scoped to a Vendor; absent -> editing the Main (platform default) scheme. */
  vendorId?: string;
  /** Whether this Vendor currently has its own override saved (vs inheriting Main). */
  isVendorOverride?: boolean;
}) {
  const [scheme, setScheme] = useState(initialScheme);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const preview = useMemo(() => formatNumber(scheme, scheme.sequenceStart), [scheme]);

  function update<K extends keyof NumberingScheme>(key: K, value: NumberingScheme[K]) {
    setScheme((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      if (vendorId) {
        await saveVendorSchemeAction(vendorId, documentType, scheme);
      } else {
        await saveMainSchemeAction(documentType, scheme);
      }
      setSaved(true);
    });
  }

  function handleClear() {
    if (!vendorId) return;
    startTransition(() => clearVendorSchemeAction(vendorId, documentType));
  }

  function handleFetchNext() {
    startTransition(async () => {
      const num = await fetchNextNumberAction(documentType, vendorId);
      setLastFetched(num);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">{documentTypeLabel}</h3>
          {vendorId && !isVendorOverride && (
            <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted">
              Inheriting Main
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs font-semibold text-success">Saved</span>}
          {vendorId && isVendorOverride && (
            <button type="button" onClick={handleClear} disabled={isPending} className="btn-outline px-3 py-1.5 text-xs">
              Use Main scheme
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={isPending} className="btn-accent px-3 py-1.5 text-xs">
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Prefix">
          <input
            value={scheme.prefix}
            onChange={(e) => update("prefix", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </Field>
        <Field label="Separator">
          <select
            value={scheme.separator}
            onChange={(e) => update("separator", e.target.value as Separator)}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            {SEPARATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Financial year">
          <select
            value={scheme.financialYearFormat}
            onChange={(e) => update("financialYearFormat", e.target.value as FinancialYearFormat)}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            {FY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.example ? ` (${o.example})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sequence digits">
          <input
            type="number"
            min={1}
            max={10}
            value={scheme.sequenceDigits}
            onChange={(e) => update("sequenceDigits", Number(e.target.value))}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text tabular-nums outline-none focus:border-accent"
          />
        </Field>
        <Field label="Sequence start">
          <input
            type="number"
            min={1}
            value={scheme.sequenceStart}
            onChange={(e) => update("sequenceStart", Number(e.target.value))}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text tabular-nums outline-none focus:border-accent"
          />
        </Field>
        <Field label="Suffix">
          <input
            value={scheme.suffix}
            onChange={(e) => update("suffix", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Preview (first number)
          </div>
          <div className="mt-1 font-mono text-lg font-bold tabular-nums text-text">{preview}</div>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          {lastFetched && (
            <div className="mb-1 font-mono text-xs text-text-muted">
              Last fetched: <span className="font-semibold text-teal">{lastFetched}</span>
            </div>
          )}
          <button type="button" onClick={handleFetchNext} disabled={isPending} className="btn-outline text-xs">
            Fetch next live number
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
