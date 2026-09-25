"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMarketplaceOrderAction } from "./actions";

export type MarketplaceListingOption = { id: string; title: string; price: number; stockQuantity: number };

/**
 * New Marketplace Order form: pick a listing, enter customer details and
 * quantity. Shows a live price x quantity preview, but the real
 * totalAmount is always recomputed server-side in createMarketplaceOrder()
 * from the listing's own current price — this preview is display-only.
 * Stock sufficiency is also re-checked server-side (fail-closed); the
 * client-side max on the quantity input is just a courtesy, not the real
 * gate.
 */
export function MarketplaceOrderNewForm({
  partnerId,
  listings,
}: {
  partnerId: string;
  listings: MarketplaceListingOption[];
}) {
  const router = useRouter();
  const [listingId, setListingId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedListing = useMemo(() => listings.find((l) => l.id === listingId), [listings, listingId]);
  const previewTotal = selectedListing ? Math.round(selectedListing.price * quantity * 100) / 100 : 0;

  function handleSubmit() {
    setError(null);
    if (!listingId) {
      setError("Select a listing.");
      return;
    }
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!(quantity > 0)) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    startTransition(async () => {
      const result = await createMarketplaceOrderAction(partnerId, {
        listingId,
        customerName,
        customerContact,
        quantity,
      });
      if (result?.error) setError(result.error);
      // On success the action itself redirects.
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Listing *</label>
        <select
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">Select a listing…</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title} — ₹{l.price} — {l.stockQuantity} in stock
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Customer Name *</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Customer Contact</label>
        <input
          type="text"
          value={customerContact}
          onChange={(e) => setCustomerContact(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Quantity *</label>
        <input
          type="number"
          min={1}
          max={selectedListing?.stockQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
          className="w-40 rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      {selectedListing && (
        <div className="rounded-md border border-border bg-bg-raised p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Estimated Total</span>
            <span className="font-semibold text-text">₹{previewTotal.toFixed(2)}</span>
          </div>
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
