"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWholesaleOrderAction } from "./actions";

export type CustomerOption = { id: string; name: string; defaultPriceTierId: string | null };
export type PriceTierOption = { id: string; name: string; discountPercent: number };
export type ProductOption = { id: string; sku: string; name: string; unit: string; listPrice: number; gstRateBps: number; minimumQuantity: number };

export function WholesaleOrderNewForm({ partnerId, customers, priceTiers, products }: { partnerId: string; customers: CustomerOption[]; priceTiers: PriceTierOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [priceTierId, setPriceTierId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const customer = customers.find((item) => item.id === customerId);
  const selectedTierId = priceTierId || customer?.defaultPriceTierId || "";
  const discountPercent = priceTiers.find((tier) => tier.id === selectedTierId)?.discountPercent ?? 0;
  const selected = products.filter((product) => Number(quantities[product.id]) > 0);
  const totals = useMemo(() => selected.reduce((acc, product) => {
    const qty = Number(quantities[product.id]);
    const subtotal = Math.round(product.listPrice * (1 - discountPercent / 100) * qty);
    const tax = Math.round(subtotal * product.gstRateBps / 10000);
    return { subtotal: acc.subtotal + subtotal, tax: acc.tax + tax };
  }, { subtotal: 0, tax: 0 }), [selected, quantities, discountPercent]);

  function submit() {
    setError(null);
    if (!customerId) return setError("Choose a dealer account.");
    if (!selected.length) return setError("Add at least one product with a valid quantity.");
    const invalid = selected.find((product) => Number(quantities[product.id]) < product.minimumQuantity);
    if (invalid) return setError(`${invalid.name} requires a minimum quantity of ${invalid.minimumQuantity} ${invalid.unit}.`);
    startTransition(async () => {
      try {
        const result = await createWholesaleOrderAction(partnerId, {
          customerId, priceTierId: selectedTierId || undefined, orderDate,
          lines: selected.map((product) => ({ productId: product.id, materialId: product.id, materialLabel: product.name, quantity: Number(quantities[product.id]), unitPrice: product.listPrice, gstRateBps: product.gstRateBps })),
        });
        if (result?.error) setError(result.error);
      } catch (e) { setError(e instanceof Error ? e.message : "Could not create the order."); }
    });
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Dealer *<select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPriceTierId(""); }} className="input mt-1 w-full"><option value="">Choose dealer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Price tier<select value={selectedTierId} onChange={(e) => setPriceTierId(e.target.value)} className="input mt-1 w-full"><option value="">List price</option>{priceTiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name} · {tier.discountPercent}% off</option>)}</select><span className="mt-1 block font-normal normal-case">Dealer default tier is preselected.</span></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Order date *<input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="input mt-1 w-full" /></label>
    </div>
    {products.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-sm text-text-muted">Add products to the distributor catalogue before creating an order.</div> : <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-bg-raised text-left text-xs uppercase text-text-muted"><tr><th className="p-3">SKU / Product</th><th className="p-3 text-right">List price</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Minimum</th><th className="p-3">Quantity</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-border"><td className="p-3"><span className="font-medium">{product.name}</span><span className="block text-xs text-text-muted">{product.sku} · per {product.unit}</span></td><td className="p-3 text-right">₹{(product.listPrice / 100).toFixed(2)}</td><td className="p-3 text-right">{product.gstRateBps / 100}%</td><td className="p-3 text-right">{product.minimumQuantity} {product.unit}</td><td className="p-3"><input type="number" min={product.minimumQuantity} step="any" value={quantities[product.id] ?? ""} onChange={(e) => setQuantities((current) => ({ ...current, [product.id]: Number(e.target.value) || 0 }))} className="input w-28" aria-label={`Quantity for ${product.name}`} /></td></tr>)}</tbody></table></div>}
    <div className="rounded-xl border border-border bg-bg-raised p-4 text-sm"><div className="flex justify-between"><span>Subtotal after discount {discountPercent > 0 ? `(${discountPercent}%)` : ""}</span><strong>₹{(totals.subtotal / 100).toFixed(2)}</strong></div><div className="mt-1 flex justify-between text-text-muted"><span>GST</span><span>₹{(totals.tax / 100).toFixed(2)}</span></div><div className="mt-2 flex justify-between border-t border-border pt-2 text-base"><strong>Order total</strong><strong>₹{((totals.subtotal + totals.tax) / 100).toFixed(2)}</strong></div></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex gap-3"><button type="button" className="btn-accent" disabled={pending} onClick={submit}>{pending ? "Creating…" : "Create order"}</button><button type="button" className="btn-outline" onClick={() => router.back()}>Cancel</button></div>
  </div>;
}
