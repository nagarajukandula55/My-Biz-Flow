"use client";

import type { LineItem } from "@/lib/sample-data/billing";
import { formatCurrencyINR } from "@/lib/format";
import { HSN_CODES } from "@/lib/sample-data/bom";

const EMPTY_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18, priceMode: "excl" };

/**
 * The one place that turns a line item into its real numbers. `unitPrice`
 * is ALWAYS exactly what was typed into the Unit Price box — toggling
 * Excl/Incl GST never rewrites it, only changes which formula below
 * applies to that same number:
 *  - "excl" (default): unitPrice is the pre-tax rate. Tax is added on top
 *    — lineTotal = taxable + tax, bigger than what's in the box.
 *  - "incl": unitPrice IS the final, tax-inclusive per-unit rate. Tax is
 *    backed OUT of it — lineTotal = quantity * unitPrice EXACTLY (matches
 *    what's typed), taxable = lineTotal / (1 + rate/100).
 */
export function lineAmounts(item: LineItem, showTax: boolean) {
  const rate = showTax ? item.taxRate : 0;
  const mode = item.priceMode ?? "excl";
  const gross = item.quantity * item.unitPrice;
  if (mode === "incl") {
    const taxable = rate > 0 ? gross / (1 + rate / 100) : gross;
    return { taxable, tax: gross - taxable, total: gross };
  }
  const tax = gross * (rate / 100);
  return { taxable: gross, tax, total: gross + tax };
}

export function computeTotals(items: LineItem[], showTax = true) {
  let subtotal = 0;
  let taxTotal = 0;
  for (const it of items) {
    const { taxable, tax } = lineAmounts(it, showTax);
    subtotal += taxable;
    taxTotal += tax;
  }
  return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
}

/**
 * Config-independent (unlike RecordForm's field-driven inputs) because a
 * repeating, live-computed line-item table is a genuinely different shape
 * of input than any single field type — documented as a deliberate
 * exception in DESIGN_SYSTEM.md §8, used only by Billing's invoice
 * create/edit flow, not a general-purpose RecordForm replacement.
 */
export type ItemOption = {
  id: string;
  label: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
  /** HSN/SAC code from the catalog record — stamped onto the line alongside rate/tax when picked. */
  hsnCode?: string;
};

export function LineItemsEditor({
  items,
  onChange,
  showTax = true,
  showHsn = false,
  itemOptions,
  interState,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  /** Non-GST invoices don't carry a tax rate per line item — hides the
   * Tax % column and the Tax row in the totals summary, and excludes tax
   * from the computed line/grand totals. */
  showTax?: boolean;
  /** Adds a per-line HSN/SAC code column — used by Billing's GST invoice
   * (mirrors AN-CRM's tax-invoice line shape) and left off every other
   * caller of this shared editor so their layout is unchanged. */
  showHsn?: boolean;
  /** When provided, each row gets a "pick from catalog" select that
   * autofills description/unit/rate/tax/HSN from this partner's own live
   * Material Catalog (BOM) record — a line can still be typed freehand
   * instead. Shared with Service Centre's own BOM-priced part lines
   * rather than a separate Billing-only product list — see
   * lib/lineItemCatalog.ts. */
  itemOptions?: ItemOption[];
  /**
   * Place-of-supply result (customer state vs partner state), passed in by
   * the caller (BillingInvoiceForm's own `interState`, same one that
   * drives its Totals box) so this editor can show each line's own
   * CGST/SGST or IGST split live, on the create form, rather than only
   * ever surfacing that split later on the printed document (which
   * ServiceCentreInvoiceDocument.tsx and BillingInvoiceDocument.tsx
   * already compute per-line the same way — taxable * taxRate/100, halved
   * into CGST+SGST when intra-state, or taken whole as IGST when
   * inter-state). Only rendered when showTax is also true and this prop
   * is provided — every other caller of this editor is unaffected.
   */
  interState?: boolean;
}) {
  function updateItem(idx: number, patch: Partial<LineItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function addItem() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  function applyItemOption(idx: number, itemId: string) {
    const option = itemOptions?.find((o) => o.id === itemId);
    if (!option) return;
    updateItem(idx, {
      itemId: option.id,
      description: option.label,
      unit: option.unit,
      // Catalog rates are stored tax-exclusive, same as unitPrice's own
      // canonical convention — reset to "excl" so a prior Incl-GST toggle
      // on this row doesn't reinterpret the catalog's already-exclusive
      // rate as if it were inclusive.
      unitPrice: option.unitPrice,
      priceMode: "excl",
      taxRate: showTax ? option.taxRate : 0,
      hsnCode: option.hsnCode ?? "",
    });
  }

  const { subtotal, taxTotal, grandTotal } = computeTotals(items, showTax);
  const showGstSplit = showTax && interState !== undefined;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              {itemOptions && <th className="w-44 px-3 py-2.5">Catalog Item</th>}
              <th className="px-3 py-2.5">Description</th>
              {showHsn && <th className="w-24 px-3 py-2.5">HSN/SAC</th>}
              <th className="w-20 px-3 py-2.5 text-right">Qty</th>
              <th className="w-24 px-3 py-2.5">Unit</th>
              <th className="w-32 px-3 py-2.5 text-right">Unit Price</th>
              {showTax && <th className="w-28 px-3 py-2.5 text-right">Taxable Value</th>}
              {showTax && <th className="w-24 px-3 py-2.5 text-right">Tax %</th>}
              {showGstSplit && interState && <th className="w-24 px-3 py-2.5 text-right">IGST</th>}
              {showGstSplit && !interState && (
                <>
                  <th className="w-20 px-3 py-2.5 text-right">CGST</th>
                  <th className="w-20 px-3 py-2.5 text-right">SGST</th>
                </>
              )}
              <th className="w-32 px-3 py-2.5 text-right">Line Total</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const { taxable: lineTaxable, tax: lineGst, total: lineTotal } = lineAmounts(item, showTax);
              const lineCgst = showGstSplit && !interState ? lineGst / 2 : 0;
              const lineSgst = showGstSplit && !interState ? lineGst / 2 : 0;
              const lineIgst = showGstSplit && interState ? lineGst : 0;
              return (
                <tr key={i} className="border-b border-border last:border-b-0">
                  {itemOptions && (
                    <td className="px-3 py-2">
                      <select
                        value={item.itemId ?? ""}
                        onChange={(e) => applyItemOption(i, e.target.value)}
                        className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                      >
                        <option value="">Type freehand…</option>
                        {itemOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      placeholder="Item or service description"
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                    />
                  </td>
                  {showHsn && (
                    <td className="px-3 py-2">
                      {/* Pick-from-list-or-type-your-own, same convention as
                          RecordForm's `suggestions` combobox fields: a plain
                          text input with a `list` pointing at a shared
                          <datalist>, not a closed <select> — real GST HSN
                          data is broader than HSN_CODES's curated list, so
                          a code that isn't in it must still be enterable. */}
                      <input
                        value={item.hsnCode ?? ""}
                        onChange={(e) => updateItem(i, { hsnCode: e.target.value })}
                        placeholder="HSN"
                        list="line-item-hsn-codes"
                        className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 0 })}
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })}
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                    />
                    {showTax && (
                      <div className="mt-1 flex gap-1 text-[10px] font-semibold uppercase tracking-wide">
                        {(["excl", "incl"] as const).map((mode) => {
                          const active = (item.priceMode ?? "excl") === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => updateItem(i, { priceMode: mode })}
                              className={`flex-1 rounded px-1.5 py-0.5 transition-colors ${
                                active ? "bg-accent text-white" : "bg-bg-sunken text-text-muted hover:text-text"
                              }`}
                            >
                              {mode === "excl" ? "Excl GST" : "Incl GST"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  {showTax && (
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                      {formatCurrencyINR(lineTaxable)}
                    </td>
                  )}
                  {showTax && (
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.taxRate}
                        onChange={(e) => updateItem(i, { taxRate: Number(e.target.value) || 0 })}
                        className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                      />
                    </td>
                  )}
                  {showGstSplit && interState && (
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                      {formatCurrencyINR(lineIgst)}
                    </td>
                  )}
                  {showGstSplit && !interState && (
                    <>
                      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                        {formatCurrencyINR(lineCgst)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                        {formatCurrencyINR(lineSgst)}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums text-text">
                    {formatCurrencyINR(lineTotal)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        aria-label="Remove line item"
                        className="text-text-muted hover:text-danger"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showHsn && (
        <datalist id="line-item-hsn-codes">
          {HSN_CODES.map((h) => (
            <option key={h.code} value={h.code}>
              {h.description}
            </option>
          ))}
        </datalist>
      )}

      <button type="button" onClick={addItem} className="btn-outline mt-3 px-3 py-1.5 text-xs">
        + Add line item
      </button>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs rounded-lg border border-border bg-bg-raised p-4 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatCurrencyINR(subtotal)}</span>
          </div>
          {showTax && (
            <div className="mt-1.5 flex justify-between text-text-muted">
              <span>Tax</span>
              <span className="font-mono tabular-nums">{formatCurrencyINR(taxTotal)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-text">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrencyINR(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
