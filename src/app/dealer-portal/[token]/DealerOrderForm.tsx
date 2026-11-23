"use client";

import { useMemo, useState, useTransition } from "react";
import { placeDealerOrderAction } from "./actions";

type Product = { id: string; sku: string; name: string; description: string | null; unit: string; listPrice: number; gstRateBps: number; minimumQuantity: number };
export function DealerOrderForm({ token, products, discountPercent }: { token: string; products: Product[]; discountPercent: number }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = products.filter((product) => Number(quantities[product.id]) > 0);
  const totals = useMemo(() => selected.reduce((sum, product) => {
    const net = Math.round(product.listPrice * (1 - discountPercent / 100) * Number(quantities[product.id]));
    return { subtotal: sum.subtotal + net, tax: sum.tax + Math.round(net * product.gstRateBps / 10000) };
  }, { subtotal: 0, tax: 0 }), [selected, quantities, discountPercent]);
  function submit() {
    setError(""); setSuccess("");
    const invalid = selected.find((product) => Number(quantities[product.id]) < product.minimumQuantity);
    if (!selected.length) return setError("Choose at least one product and quantity.");
    if (invalid) return setError(`${invalid.name} has a minimum order quantity of ${invalid.minimumQuantity} ${invalid.unit}.`);
    startTransition(async () => {
      const result = await placeDealerOrderAction(token, selected.map((product) => ({ productId: product.id, quantity: Number(quantities[product.id]) })));
      if (result.error) setError(result.error);
      else { setSuccess(`Order ${result.orderNumber} submitted for distributor confirmation.`); setQuantities({}); }
    });
  }
  return <section className="rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-lg font-semibold">Place a dealer order</h2><p className="mt-1 text-sm text-text-muted">Prices and GST are calculated from the distributor’s live catalogue. Your price tier discount is included. The distributor confirms stock and dispatch.</p>
    {products.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">The distributor has not published any active products yet.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-bg-raised text-left text-xs uppercase text-text-muted"><tr><th className="p-3">Product</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Minimum</th><th className="p-3">Quantity</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-border"><td className="p-3"><strong>{product.name}</strong><span className="block text-xs text-text-muted">{product.sku}{product.description ? ` · ${product.description}` : ""}</span></td><td className="p-3 text-right">₹{((product.listPrice * (1 - discountPercent / 100)) / 100).toFixed(2)}</td><td className="p-3 text-right">{product.gstRateBps / 100}%</td><td className="p-3 text-right">{product.minimumQuantity} {product.unit}</td><td className="p-3"><input aria-label={`Quantity of ${product.name}`} type="number" min={product.minimumQuantity} step="any" value={quantities[product.id] ?? ""} onChange={(event) => setQuantities((state) => ({ ...state, [product.id]: Number(event.target.value) || 0 }))} className="input w-28" /></td></tr>)}</tbody></table></div>}
    <div className="mt-4 flex flex-wrap justify-between gap-2 rounded-lg bg-bg-raised p-3 text-sm"><span>Subtotal ₹{(totals.subtotal / 100).toFixed(2)} + GST ₹{(totals.tax / 100).toFixed(2)}</span><strong>Total ₹{((totals.subtotal + totals.tax) / 100).toFixed(2)}</strong></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}{success && <p role="status" className="mt-3 text-sm text-teal">{success}</p>}
    <button type="button" onClick={submit} disabled={pending || !products.length} className="btn-accent mt-4">{pending ? "Submitting order…" : "Submit order"}</button>
  </section>;
}
