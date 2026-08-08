"use client";

import type { LineItem } from "@/lib/sample-data/billing";
import { formatCurrencyINR } from "@/lib/format";

const EMPTY_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18 };

export function computeTotals(items: LineItem[], showTax = true) {
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const taxTotal = showTax
    ? items.reduce((sum, it) => sum + it.quantity * it.unitPrice * (it.taxRate / 100), 0)
    : 0;
  return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
}

/**
 * Config-independent (unlike RecordForm's field-driven inputs) because a
 * repeating, live-computed line-item table is a genuinely different shape
 * of input than any single field type — documented as a deliberate
 * exception in DESIGN_SYSTEM.md §8, used only by Billing's invoice
 * create/edit flow, not a general-purpose RecordForm replacement.
 */
export function LineItemsEditor({
  items,
  onChange,
  showTax = true,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  /** Non-GST invoices don't carry a tax rate per line item — hides the
   * Tax % column and the Tax row in the totals summary, and excludes tax
   * from the computed line/grand totals. */
  showTax?: boolean;
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

  const { subtotal, taxTotal, grandTotal } = computeTotals(items, showTax);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-3 py-2.5">Description</th>
              <th className="w-20 px-3 py-2.5 text-right">Qty</th>
              <th className="w-24 px-3 py-2.5">Unit</th>
              <th className="w-32 px-3 py-2.5 text-right">Unit Price</th>
              {showTax && <th className="w-24 px-3 py-2.5 text-right">Tax %</th>}
              <th className="w-32 px-3 py-2.5 text-right">Line Total</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const lineTotal = item.quantity * item.unitPrice * (1 + (showTax ? item.taxRate : 0) / 100);
              return (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      placeholder="Item or service description"
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                    />
                  </td>
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
                  </td>
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
