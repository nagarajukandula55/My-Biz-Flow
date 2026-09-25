"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createWholesaleOrderAction } from "./actions";

export type CustomerOption = { id: string; name: string };
export type PriceTierOption = { id: string; name: string; discountPercent: number };

/**
 * New Wholesale Order form: a Customer + Price Tier select (shared header,
 * same convention StockAdjustmentsNewButton uses for its header fields)
 * plus a per-material line-items table reusing MaterialLineItemsTable (see
 * that component's own doc comment — reused from Inventory) with
 * showUnitPrice on, since a wholesale order line is priced. There is no
 * material catalog for this module (unlike Inventory's BOM), so
 * materialOptions is empty and the line's Material cell is a free-typed
 * label via InlineTypeahead's own "type anything" fallback.
 *
 * When a Price Tier is selected, each row's discounted line total (base
 * unit price x (1 - discountPercent/100) x qty) is shown alongside the
 * struck-through base total, so the discount is visible before submitting
 * — the actual totalAmount persisted is always the discounted sum,
 * recomputed server-side in createWholesaleOrderAction (never trusted from
 * the client).
 */
export function WholesaleOrderNewForm({
  partnerId,
  customers,
  priceTiers,
}: {
  partnerId: string;
  customers: CustomerOption[];
  priceTiers: PriceTierOption[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [priceTierId, setPriceTierId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<MaterialLineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const materialOptions: MaterialLineOption[] = [];

  const discountPercent = useMemo(
    () => priceTiers.find((t) => t.id === priceTierId)?.discountPercent ?? 0,
    [priceTiers, priceTierId]
  );

  const baseTotal = items.reduce((sum, it) => sum + (it.unitPrice ?? 0) * it.quantity, 0);
  const discountedTotal = Math.round(baseTotal * (1 - discountPercent / 100) * 100) / 100;

  function handleSubmit() {
    setError(null);
    if (!customerId) {
      setError("Customer is required.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    startTransition(async () => {
      const result = await createWholesaleOrderAction(partnerId, {
        customerId,
        priceTierId: priceTierId || undefined,
        orderDate,
        lines: items.map((it) => ({
          materialId: it.materialId,
          materialLabel: it.materialId,
          quantity: it.quantity,
          unitPrice: Math.round((it.unitPrice ?? 0) * 100), // rupees -> paise
        })),
      });
      if (result?.error) {
        setError(result.error);
      }
      // On success the action itself redirects — no client-side navigation needed here.
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Customer *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Price Tier</label>
          <select
            value={priceTierId}
            onChange={(e) => setPriceTierId(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">No tier — list price</option>
            {priceTiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.discountPercent}% off)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Order Date *</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
        <p className="mb-2 text-xs text-text-muted">
          Add one row per item — type a description and Unit Price (₹, base/list price before any tier discount).
        </p>
        <MaterialLineItemsTable items={items} onChange={setItems} materialOptions={materialOptions} showUnitPrice />
      </div>

      {items.length > 0 && (
        <div className="rounded-md border border-border bg-bg-raised p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Base total</span>
            <span className={discountPercent > 0 ? "text-text-muted line-through" : "font-semibold text-text"}>
              ₹{baseTotal.toFixed(2)}
            </span>
          </div>
          {discountPercent > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-text-muted">Discounted total ({discountPercent}% off)</span>
              <span className="font-semibold text-text">₹{discountedTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="button" className="btn-accent" disabled={pending} onClick={handleSubmit}>
          {pending ? "Creating…" : "Create Order"}
        </button>
        <button type="button" className="btn-outline" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
