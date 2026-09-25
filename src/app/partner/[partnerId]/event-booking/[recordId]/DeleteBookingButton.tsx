"use client";

import { useTransition } from "react";
import { deleteEventBookingAction } from "./actions";

export function DeleteBookingButton({ partnerId, bookingId, label }: { partnerId: string; bookingId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-outline text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete booking "${label}"? This cannot be undone.`)) return;
        startTransition(async () => {
          await deleteEventBookingAction(partnerId, bookingId);
        });
      }}
    >
      Delete
    </button>
  );
}
