"use client";

import { useMemo, useState, useTransition } from "react";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import { computeSaleTotals, type SaleLine, type Tender } from "@/lib/sample-data/pos";
import { completeSaleAction, type CompleteSaleInput } from "./actions";

type StockItem = { sku: string; label: string; unitPrice: number; taxRate: number; available: number };

const TENDER_METHODS: Tender["method"][] = ["Cash", "UPI", "Card", "Wallet"];

export function PosCheckout({
  partnerId,
  stockItems,
  cashier,
  branch,
}: {
  partnerId: string;
  stockItems: StockItem[];
  cashier?: string;
  branch?: string;
}) {
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([{ method: "Cash", amount: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stockBySku = useMemo(() => new Map(stockItems.map((s) => [s.sku, s])), [stockItems]);
  const options: SearchSelectOption[] = stockItems.map((s) => ({
    value: s.sku,
    label: s.label,
    sublabel: `₹${s.unitPrice} · ${s.available} in stock`,
  }));

  const totals = computeSaleTotals(lines);
  const amountTendered = tenders.reduce((sum, t) => sum + (t.amount || 0), 0);
  const remainingDue = Math.max(0, Math.round((totals.totalAmount - amountTendered) * 100) / 100);
  const changeDue = Math.max(0, Math.round((amountTendered - totals.totalAmount) * 100) / 100);

  function addProduct(option: SearchSelectOption) {
    const stock = stockBySku.get(option.value);
    if (!stock) return;
    setPickerOpen(false);
    setLines((prev) => {
      const existing = prev.find((l) => l.sku === option.value);
      if (existing) {
        return prev.map((l) => (l.sku === option.value ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          id: `L-${Date.now()}`,
          sku: stock.sku,
          productName: stock.label,
          qty: 1,
          unitPrice: stock.unitPrice,
          taxRate: stock.taxRate,
          discount: 0,
        },
      ];
    });
  }

  function updateLine(id: string, patch: Partial<SaleLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateTender(index: number, patch: Partial<Tender>) {
    setTenders((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTender() {
    setTenders((prev) => [...prev, { method: "Cash", amount: 0 }]);
  }

  function removeTender(index: number) {
    setTenders((prev) => prev.filter((_, i) => i !== index));
  }

  function completeSale() {
    setError(null);
    const input: CompleteSaleInput = { lines, tenders: tenders.filter((t) => t.amount > 0), cashier, branch };
    startTransition(async () => {
      try {
        await completeSaleAction(partnerId, input);
      } catch (e) {
        // redirect() inside the server action throws a special NEXT_REDIRECT
        // error to unwind — that's success, not a failure, so let it propagate.
        const digest = (e as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw e;
        setError(e instanceof Error ? e.message : "Failed to complete sale");
      }
    });
  }

  const canComplete = lines.length > 0 && remainingDue === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Cart */}
      <div className="lg:col-span-2">
        <div className="rounded-md border border-border bg-bg-raised p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-text">Cart</h2>
            <button type="button" className="btn-accent" onClick={() => setPickerOpen(true)}>
              + Add Product
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">
              Scan or search a product to add it to the cart — a barcode scanner acting as a keyboard works
              directly in the search box.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="rounded-md border border-border bg-bg px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text">{line.productName}</div>
                      <div className="text-xs text-text-muted">
                        {line.sku} · ₹{line.unitPrice} · GST {line.taxRate}%
                      </div>
                    </div>
                    <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeLine(line.id)}>
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md border border-border text-sm text-text"
                        onClick={() => updateLine(line.id, { qty: Math.max(1, line.qty - 1) })}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(line.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-14 rounded-md border border-border bg-bg-raised px-2 py-1 text-center text-sm text-text"
                      />
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md border border-border text-sm text-text"
                        onClick={() => updateLine(line.id, { qty: line.qty + 1 })}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      Discount
                      <input
                        type="number"
                        min={0}
                        value={line.discount}
                        onChange={(e) => updateLine(line.id, { discount: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-20 rounded-md border border-border bg-bg-raised px-2 py-1 text-sm text-text"
                      />
                    </div>
                    <span className="ml-auto text-sm font-semibold tabular-nums text-text">
                      ₹{Math.max(0, line.qty * line.unitPrice - line.discount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Totals + Payment */}
      <div>
        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Payment</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{totals.subtotal}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Discount</span>
              <span className="tabular-nums">−₹{totals.discountTotal}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Tax</span>
              <span className="tabular-nums">₹{totals.taxAmount}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold text-text">
              <span>Total</span>
              <span className="tabular-nums">₹{totals.totalAmount}</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {tenders.map((tender, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={tender.method}
                  onChange={(e) => updateTender(i, { method: e.target.value as Tender["method"] })}
                  className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                >
                  {TENDER_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={tender.amount || ""}
                  onChange={(e) => updateTender(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
                  placeholder="Amount"
                  className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                />
                {tenders.length > 1 && (
                  <button type="button" className="text-xs text-danger" onClick={() => removeTender(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-outline text-xs" onClick={addTender}>
              + Add tender (split payment)
            </button>
          </div>

          <div className="mt-3 space-y-1 text-sm">
            {remainingDue > 0 ? (
              <div className="flex justify-between font-semibold text-danger">
                <span>Remaining due</span>
                <span className="tabular-nums">₹{remainingDue}</span>
              </div>
            ) : (
              <div className="flex justify-between font-semibold text-success">
                <span>Change due</span>
                <span className="tabular-nums">₹{changeDue}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn-accent mt-4 w-full disabled:opacity-50"
            disabled={!canComplete || isPending}
            onClick={completeSale}
          >
            {isPending ? "Completing…" : "Complete Sale"}
          </button>
        </div>
      </div>

      <SearchSelectModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Product"
        options={options}
        onSelect={addProduct}
        searchPlaceholder="Search or scan SKU…"
      />
    </div>
  );
}
