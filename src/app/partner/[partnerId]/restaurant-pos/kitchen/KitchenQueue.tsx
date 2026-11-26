"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import type { RestaurantOrder } from "@/lib/sample-data/restaurant-pos";
import { markServedAction } from "../actions";

export function KitchenQueue({ partnerId, orders }: { partnerId: string; orders: RestaurantOrder[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [router]);

  function markServed(orderId: string) {
    setError("");
    startTransition(async () => {
      try {
        await markServedAction(partnerId, orderId);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not update this order.");
      }
    });
  }

  if (orders.length === 0) return <p className="mt-5 text-sm text-text-muted">No kitchen tickets are waiting right now. This screen refreshes every 15 seconds.</p>;
  return <div className="mt-5">
    <p className="text-sm text-text-muted">Automatically refreshed every 15 seconds.</p>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      {orders.map(order => <article key={order.id} className="rounded-lg border border-border bg-bg-raised p-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div><h2 className="font-display text-lg font-bold text-text">{order.tableNumber}</h2><p className="text-xs text-text-muted">Ticket {order.id} · {order.covers} cover{order.covers === 1 ? "" : "s"}</p></div>
          <StatusChip label={order.status} variant="warning" />
        </header>
        <ul className="my-4 space-y-2">{order.lines.filter(line => line.kotSent).map(line => <li key={line.id} className="text-sm font-semibold text-text">{line.qty} × {line.name}</li>)}</ul>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-text-muted">Sent {order.kotSentAt ? new Date(order.kotSentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "time unavailable"}</p>
          {order.lines.some(line => !line.kotSent)
            ? <p className="text-xs text-warning">Send the new items from the table before serving.</p>
            : <button type="button" className="btn-accent min-h-11" disabled={isPending} onClick={() => markServed(order.id)}>{isPending ? "Saving…" : "Mark served"}</button>}
        </footer>
      </article>)}
    </div>
  </div>;
}
