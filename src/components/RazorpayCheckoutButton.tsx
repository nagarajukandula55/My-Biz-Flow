"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function RazorpayCheckoutButton({
  partnerId,
  partnerName,
  partnerEmail,
  partnerContact,
  amount,
  publicKeyId,
  /** Defaults to the subscription order/verify routes; pass to reuse this
   *  same widget for a different payable (e.g. a Booking). */
  createOrderUrl = "/api/razorpay/create-order",
  verifyUrl = "/api/razorpay/verify",
  /** Extra body fields sent to createOrderUrl/verifyUrl alongside partnerId
   *  (e.g. { bookingId }). */
  extraBody,
  description = "subscription",
  /** Header shown at the top of the Razorpay checkout widget. Defaults to
   *  plain "My Biz Flow" for payables where My Biz Flow is not the seller
   *  (e.g. a Field Force Booking, paid to the partner). The subscription
   *  flow below overrides this to also surface the legal entity, since
   *  that's the one payable where My Biz Flow itself is the seller. */
  billedByName = "My Biz Flow",
}: {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerContact: string;
  amount: number;
  publicKeyId?: string;
  createOrderUrl?: string;
  verifyUrl?: string;
  extraBody?: Record<string, string>;
  description?: string;
  billedByName?: string;
}) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!publicKeyId) {
    return (
      <p className="rounded-md border border-dashed border-border bg-bg p-3 text-xs text-text-muted">
        Payments aren&apos;t configured yet — a Super Admin needs to add Razorpay keys before you can pay online.
      </p>
    );
  }

  async function handlePay() {
    setPending(true);
    setError("");
    try {
      const orderRes = await fetch(createOrderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, ...extraBody }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not start payment");

      const razorpay = new window.Razorpay({
        key: publicKeyId,
        amount: order.amount,
        currency: order.currency,
        name: billedByName,
        description: order.planName ? `${order.planName} subscription` : description,
        order_id: order.orderId,
        prefill: { name: partnerName, email: partnerEmail, contact: partnerContact },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partnerId, ...extraBody, ...response }),
          });
          if (verifyRes.ok) {
            router.refresh();
          } else {
            const body = await verifyRes.json();
            setError(body.error ?? "Payment could not be verified");
          }
        },
        modal: { ondismiss: () => setPending(false) },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setPending(false);
    }
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} />
      <button type="button" onClick={handlePay} disabled={!scriptReady || pending} className="btn-accent">
        {pending ? "Opening payment…" : `Pay ₹${amount.toLocaleString("en-IN")} now`}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
