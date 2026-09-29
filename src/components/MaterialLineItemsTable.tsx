"use client";

import { useEffect, useRef, useState } from "react";
import { InlineTypeahead } from "@/components/InlineTypeahead";

export type MaterialLineItem = {
  materialId: string;
  quantity: number;
  /** Only meaningful when the picked material is Serialized in BOM — one
   * barcode/serial per unit, same "one per line" shape createStockAdjustmentAction
   * already parses with parseSerialNumbers/validateSerialNumbers. Left
   * undefined for non-serialized rows and for modules (Return Orders) that
   * don't carry a serialNumbers field on the record at all. */
  serialNumbers?: string;
  /** Return Orders-only per-row field (Defective/Good) — undefined elsewhere. */
  returnType?: string;
  /** Stock Take / Stock Transfer lines only — which bucket this line counts/moves (Good/Defective). Rendered when `conditionOptions` is passed. */
  condition?: string;
  /** Stock Take / Stock Transfer lines only — unit cost/price in rupees (converted to paise by the caller before persisting). Rendered when `showUnitPrice` is true. */
  unitPrice?: number;
  /** Stock Take only — the system's expected quantity for this line before the physical count; `quantity` on this same row is read as the Counted Qty when `stockTakeMode` is true. Variance (Counted − Expected) is shown read-only, never typed. */
  expectedQty?: number;
};

export type MaterialLineOption = { value: string; label: string; serialized: boolean; rate?: number };

/**
 * Shared "add row / remove row / one row per material" line-items table for
 * Return Orders and Stock Adjustments — the same repeating-row interaction
 * pattern Billing's invoice form uses (see LineItemsEditor.tsx), rebuilt
 * here from this repo's own components/tokens rather than reused directly,
 * since a Return Order / Stock Adjustment line isn't priced (no unit
 * price/tax/HSN) and instead needs a per-row Serial/IMEI capture for a
 * Serialized material.
 *
 * Branches per row on whether the picked material is Serialized in BOM
 * (materialOptions[].serialized, from getBomOptionsForPartner):
 *  - Serialized: quantity is DERIVED from how many serial/barcode numbers
 *    are entered (one per unit, same rule validateSerialNumbers enforces
 *    server-side) — the Quantity cell shows that count read-only rather
 *    than a free-typed number, since the two must match exactly.
 *  - Non-serialized: a plain editable Quantity number field, no serial
 *    capture shown.
 *
 * Deliberately does NOT implement per-unit IMEI/serial "scan and this
 * fills in the material automatically" lookup — this app's data model has
 * no serial→material registry (BOM only flags a material as serialized;
 * it doesn't index individual serial numbers to look one up by), so
 * "scan a serial to find its material" isn't something this schema can
 * answer. Adding that would be a real schema/data-model decision, not a
 * form-layer change — left for a separate product decision rather than
 * guessed at here. Serial numbers are still captured, just against a
 * material the user picks first (search-to-add, same as the non-serialized
 * flow), not derived from the serial itself.
 */
export function MaterialLineItemsTable({
  items,
  onChange,
  materialOptions,
  showSerials,
  returnTypeOptions,
  availabilityLabels,
  conditionOptions,
  showUnitPrice,
  stockTakeMode,
  restrictMaterialToBom,
  onLookupExpectedQty,
}: {
  items: MaterialLineItem[];
  onChange: (items: MaterialLineItem[]) => void;
  materialOptions: MaterialLineOption[];
  /** Stock Adjustments only — Return Orders has no serialNumbers field on the record. */
  showSerials?: boolean;
  /** Return Orders only — renders a per-row Return Type select (Defective/Good). */
  returnTypeOptions?: string[];
  /** Optional "materialId -> live availability text" map, same one the
   * plain single-line form's Material select already embeds into its
   * option label (see withAvailability in warehouse.ts) — shown here as a
   * hint under the row's material picker instead, since this table's own
   * options list is deliberately the bare label (search needs to match on
   * material name/code, not on availability text mixed into it). */
  availabilityLabels?: Record<string, string>;
  /** Stock Take / Stock Transfer only — renders a per-row Material Type (Good/Defective) select, e.g. ["Good", "Defective"]. */
  conditionOptions?: string[];
  /** Stock Take / Stock Transfer only — renders a per-row Unit Price (₹) number input. */
  showUnitPrice?: boolean;
  /** Stock Take only — renders Expected Qty (editable) ahead of Quantity (relabelled "Counted Qty") plus a read-only Variance = Counted − Expected column. */
  stockTakeMode?: boolean;
  /** Stock Adjustments only — material must be an existing BOM entry
   * (materialOptions), no free-typed new part/material name. Stock Take and
   * other consumers leave this unset and keep free text, since Stock Take
   * is a physical count of whatever's found, not an adjustment against the
   * BOM catalog. */
  restrictMaterialToBom?: boolean;
  /** Stock Take only — called (materialId, condition) whenever a row's
   * material is picked/changed, or its Material Type is changed, so Expected
   * Qty can be pre-filled from live inventory instead of defaulting to 0.
   * Resolves to `undefined` when there's nothing to fill (e.g. no warehouse
   * picked yet in the form header) — the row's Expected Qty is left
   * untouched in that case, still a plain editable input either way. */
  onLookupExpectedQty?: (materialId: string, condition?: string) => Promise<number | undefined>;
}) {
  const [search, setSearch] = useState("");

  // Lets the async lookup callbacks below always patch the CURRENT items
  // array (this is a controlled component — `items` is a prop, so a promise
  // that resolves after a later render must not clobber rows added/removed
  // in the meantime using a stale closure over `items`).
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  function materialMeta(materialId: string): MaterialLineOption | undefined {
    return materialOptions.find((o) => o.label === materialId);
  }

  function runExpectedQtyLookup(idx: number, materialId: string, condition: string | undefined) {
    if (!stockTakeMode || !onLookupExpectedQty) return;
    void onLookupExpectedQty(materialId, condition).then((qty) => {
      if (qty === undefined) return;
      const current = itemsRef.current;
      if (idx < 0 || idx >= current.length) return;
      onChange(current.map((it, i) => (i === idx ? { ...it, expectedQty: qty } : it)));
    });
  }

  function addRow(materialId: string) {
    if (!materialId.trim()) return;
    if (
      restrictMaterialToBom &&
      !materialOptions.some((o) => o.label.toLowerCase() === materialId.trim().toLowerCase())
    ) {
      return;
    }
    // Default a new line's Unit Price from the BOM catalog's own rate for
    // the picked material, instead of always starting at ₹0 — matches how
    // BomForm/WorkorderLifecycle already stamp a picked material's catalog
    // price onto its line. Still a plain editable input afterward, so a
    // different price for this specific document is one edit away.
    const meta = materialMeta(materialId);
    const newItem: MaterialLineItem = {
      materialId,
      quantity: stockTakeMode ? 0 : 1,
      serialNumbers: "",
      returnType: returnTypeOptions?.[0],
      condition: conditionOptions?.[0],
      unitPrice: showUnitPrice ? meta?.rate ?? 0 : undefined,
      expectedQty: stockTakeMode ? 0 : undefined,
    };
    const nextItems = [...items, newItem];
    onChange(nextItems);
    setSearch("");
    runExpectedQtyLookup(nextItems.length - 1, materialId, newItem.condition);
  }

  function updateRow(idx: number, patch: Partial<MaterialLineItem>) {
    // Re-picking a row's material (not every keystroke while searching —
    // only once the typed text exactly matches a catalog entry) re-stamps
    // Unit Price from that material's catalog rate too, same as addRow.
    let finalPatch = patch;
    if (showUnitPrice && typeof patch.materialId === "string") {
      const meta = materialMeta(patch.materialId);
      if (meta?.rate !== undefined) finalPatch = { ...patch, unitPrice: meta.rate };
    }
    onChange(items.map((it, i) => (i === idx ? { ...it, ...finalPatch } : it)));
    if (stockTakeMode && ("materialId" in patch || "condition" in patch)) {
      const merged = { ...items[idx], ...finalPatch };
      runExpectedQtyLookup(idx, merged.materialId, merged.condition);
    }
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function parsedSerialCount(raw: string | undefined): number {
    return String(raw ?? "")
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean).length;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[16rem] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Search material to add
          </label>
          <InlineTypeahead
            value={search}
            onChange={setSearch}
            placeholder="Search material name or code…"
            options={materialOptions.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
            restrictToOptions={restrictMaterialToBom}
            invalidMessage="Material not found — add it in BOM first."
          />
        </div>
        <button type="button" onClick={() => addRow(search)} className="btn-accent px-3 py-1.5 text-xs">
          + Add line item
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-bg-raised p-4 text-center text-xs text-text-muted">
          No line items yet — search for a material above and add it as a row.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Material</th>
                {returnTypeOptions && <th className="w-32 px-3 py-2.5">Return Type</th>}
                {conditionOptions && <th className="w-28 px-3 py-2.5">Material Type</th>}
                {stockTakeMode && <th className="w-24 px-3 py-2.5 text-right">Expected Qty</th>}
                {showSerials && <th className="px-3 py-2.5">Serial / Barcode Numbers</th>}
                <th className="w-28 px-3 py-2.5 text-right">{stockTakeMode ? "Counted Qty" : "Quantity"}</th>
                {stockTakeMode && <th className="w-24 px-3 py-2.5 text-right">Variance</th>}
                {showUnitPrice && <th className="w-28 px-3 py-2.5 text-right">Unit Price (₹)</th>}
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const meta = materialMeta(item.materialId);
                const isSerialized = showSerials && Boolean(meta?.serialized);
                const serialCount = parsedSerialCount(item.serialNumbers);
                return (
                  <tr key={i} className="border-b border-border last:border-b-0 align-top">
                    <td className="px-3 py-2">
                      <InlineTypeahead
                        value={item.materialId}
                        onChange={(v) => updateRow(i, { materialId: v })}
                        placeholder="Material"
                        options={materialOptions.map((o) => ({ value: o.value, label: o.label }))}
                        className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                        restrictToOptions={restrictMaterialToBom}
                        invalidMessage="Material not found — add it in BOM first."
                      />
                      {availabilityLabels?.[item.materialId.split(" — ")[0]?.trim()] && (
                        <p className="mt-1 text-[11px] text-text-muted">
                          {availabilityLabels[item.materialId.split(" — ")[0].trim()]}
                        </p>
                      )}
                    </td>
                    {returnTypeOptions && (
                      <td className="px-3 py-2">
                        <select
                          value={item.returnType ?? returnTypeOptions[0]}
                          onChange={(e) => updateRow(i, { returnType: e.target.value })}
                          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                        >
                          {returnTypeOptions.map((rt) => (
                            <option key={rt} value={rt}>
                              {rt}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {conditionOptions && (
                      <td className="px-3 py-2">
                        <select
                          value={item.condition ?? conditionOptions[0]}
                          onChange={(e) => updateRow(i, { condition: e.target.value })}
                          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                        >
                          {conditionOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {stockTakeMode && (
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.expectedQty ?? 0}
                          onChange={(e) => updateRow(i, { expectedQty: Number(e.target.value) || 0 })}
                          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                        />
                      </td>
                    )}
                    {showSerials && (
                      <td className="px-3 py-2">
                        <textarea
                          value={item.serialNumbers ?? ""}
                          onChange={(e) => updateRow(i, { serialNumbers: e.target.value, quantity: parsedSerialCount(e.target.value) || item.quantity })}
                          placeholder={isSerialized ? "Scan or type one serial/IMEI per line" : "Only needed if this material is Serialized"}
                          rows={2}
                          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      {isSerialized ? (
                        <span className="inline-block w-full rounded-md border border-border bg-bg-sunken px-2.5 py-1.5 text-right text-sm tabular-nums text-text-muted" title="Derived from the number of serial/barcode numbers entered">
                          {serialCount}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => updateRow(i, { quantity: Number(e.target.value) || 0 })}
                          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                        />
                      )}
                    </td>
                    {stockTakeMode && (
                      <td className="px-3 py-2 text-right">
                        <span
                          className="inline-block w-full rounded-md border border-border bg-bg-sunken px-2.5 py-1.5 text-right text-sm tabular-nums text-text-muted"
                          title="Counted Qty − Expected Qty, computed automatically"
                        >
                          {(item.quantity || 0) - (item.expectedQty || 0)}
                        </span>
                      </td>
                    )}
                    {showUnitPrice && (
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice ?? 0}
                          onChange={(e) => updateRow(i, { unitPrice: Number(e.target.value) || 0 })}
                          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                        />
                      </td>
                    )}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        aria-label="Remove line item"
                        className="text-text-muted hover:text-danger"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
