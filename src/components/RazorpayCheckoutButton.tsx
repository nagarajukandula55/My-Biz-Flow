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
  vendorId,
  vendorName,
  vendorEmail,
  vendorContact,
  amount,
  publicKeyId,
}: {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorContact: string;
  amount: number;
  publicKeyId?: string;
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
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not start payment");

      const razorpay = new window.Razorpay({
        key: publicKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "My Biz Flow",
        description: `${order.planName} subscription`,
        order_id: order.orderId,
        prefill: { name: vendorName, email: vendorEmail, contact: vendorContact },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendorId, ...response }),
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
